"""Audio clip injection for tool call overrides.

Allows specific tools to play pre-recorded audio directly through the
transport (WebSocket or SIP) instead of having the model speak a text response.

Configuration
-------------
Set ``AUDIO_CLIP_TOOL_MAP`` to a JSON object mapping tool names to audio file
paths (raw 16-bit signed PCM at 24 kHz mono, or WAV with a standard 44-byte
header)::

    # Simple form — path only
    AUDIO_CLIP_TOOL_MAP={"get_contact_numbers": "/app/assets/contact_numbers.pcm"}

    # Extended form — path + optional description and sample_rate
    AUDIO_CLIP_TOOL_MAP={"get_contact_numbers": {"path": "/app/assets/contact_numbers.pcm", "description": "Get contact phone numbers.", "sample_rate": 24000}}

How it works
------------
1. A per-session :class:`asyncio.Queue` is registered when a session starts.
2. When the agent calls an audio-clip tool, the tool loads the pre-recorded
   PCM bytes and places them on the session queue.
3. A concurrent injection task in the transport handler reads from the queue
   and delivers the audio to the client (JSON event for WebSocket; RTP frames
   for SIP) without the model having to speak it.
4. The tool returns ``{"status": "success", "audio_playing": True}`` so the
   model can optionally produce a brief acknowledgement.
"""

import asyncio
import base64
import json
import logging
import threading
from pathlib import Path
from typing import Any, Optional

from google.adk.tools import FunctionTool, ToolContext

logger = logging.getLogger(__name__)

# Project root — used to resolve relative audio clip paths
_PROJECT_ROOT = Path(__file__).parent.parent.parent

# Standard RIFF/WAV header size in bytes.
_WAV_HEADER_SIZE = 44

# Registry: session_id -> (asyncio.Queue[bytes], asyncio.AbstractEventLoop)
_registry: dict[str, tuple[asyncio.Queue, asyncio.AbstractEventLoop]] = {}
_registry_lock = threading.Lock()


# ── Session queue management ──────────────────────────────────────────


def register_session_audio_queue(session_id: str) -> asyncio.Queue:
    """Register an audio injection queue for *session_id*.

    Must be called from within a running async context so the event loop
    reference can be captured for thread-safe enqueuing from tool callbacks.

    Returns the :class:`asyncio.Queue` that the injection task should drain.
    """
    loop = asyncio.get_running_loop()
    q: asyncio.Queue = asyncio.Queue()
    with _registry_lock:
        _registry[session_id] = (q, loop)
    logger.debug(f"Registered audio clip queue for session {session_id}")
    return q


def unregister_session_audio_queue(session_id: str) -> None:
    """Remove the audio queue for *session_id* after the session ends."""
    with _registry_lock:
        _registry.pop(session_id, None)
    logger.debug(f"Unregistered audio clip queue for session {session_id}")


def queue_audio_for_session(session_id: str, audio_bytes: bytes) -> bool:
    """Enqueue *audio_bytes* for delivery to *session_id* (thread-safe).

    Returns ``True`` if the audio was successfully queued, ``False`` if no
    queue is registered for the session.
    """
    with _registry_lock:
        entry = _registry.get(session_id)
    if entry is None:
        logger.warning(f"No audio clip queue for session {session_id!r} — clip skipped")
        return False
    q, loop = entry
    try:
        loop.call_soon_threadsafe(q.put_nowait, audio_bytes)
        return True
    except Exception as e:
        logger.error(f"Failed to queue audio for session {session_id}: {e}")
        return False


# ── Audio file loading ────────────────────────────────────────────────


def load_audio_pcm(path: str) -> Optional[bytes]:
    """Load raw PCM bytes from *path*.

    Relative paths are resolved from the project root (the directory that
    contains the ``app/`` package).  Absolute paths are used as-is.

    WAV files (detected by RIFF/WAVE magic bytes) have their 44-byte header
    stripped automatically.  Any other file is returned as-is.
    """
    resolved = Path(path) if Path(path).is_absolute() else _PROJECT_ROOT / path
    logger.debug(f"Loading audio clip: {path!r} -> {resolved}")
    try:
        data = resolved.read_bytes()
        if len(data) > 12 and data[:4] == b"RIFF" and data[8:12] == b"WAVE":
            data = data[_WAV_HEADER_SIZE:]
        logger.debug(f"Loaded audio clip: {len(data)} bytes from {resolved}")
        return data
    except Exception as e:
        logger.error(f"Failed to load audio clip from {resolved}: {e}")
        return None


# ── WebSocket event formatting ────────────────────────────────────────


def make_websocket_audio_event(pcm_bytes: bytes, sample_rate: int = 24000) -> str:
    """Encode *pcm_bytes* as a JSON WebSocket event the browser client can play.

    Produces the same ``content.parts[].inlineData`` shape as ADK LiveServerMessage
    audio events, which ``app/static/js/app.js`` already knows how to handle.
    """
    return json.dumps(
        {
            "content": {
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": f"audio/pcm;rate={sample_rate}",
                            "data": base64.b64encode(pcm_bytes).decode("ascii"),
                        }
                    }
                ]
            }
        }
    )


# ── Tool factory ─────────────────────────────────────────────────────


def create_audio_clip_tool(
    tool_name: str,
    audio_path: str,
    description: str = "",
    sample_rate: int = 24000,
) -> FunctionTool:
    """Build a :class:`FunctionTool` that plays a pre-recorded audio clip.

    When the agent calls this tool the PCM audio is pushed onto the session's
    injection queue (registered via :func:`register_session_audio_queue`).
    The concurrently running injection task in the transport handler then
    delivers the audio to the client without the model speaking it.

    Args:
        tool_name:   Name exposed to the model — must match what the system
                     instructions refer to.
        audio_path:  Absolute path to a raw PCM or WAV audio file.
        description: Natural-language description for the model.
        sample_rate: PCM sample rate of the audio file (default 24 000 Hz).
    """
    audio_data = load_audio_pcm(audio_path)
    if audio_data is None:
        logger.error(
            f"Audio clip tool '{tool_name}': could not load {audio_path!r} — "
            "tool will succeed silently without playing audio"
        )

    def _tool_fn(tool_context: ToolContext) -> dict[str, Any]:
        session_id = tool_context.session.id if tool_context.session else None
        logger.info(f"Audio clip tool '{tool_name}' called — session={session_id}, has_audio={audio_data is not None}")
        if not audio_data:
            logger.error(f"Audio clip tool '{tool_name}': no audio loaded — check path {audio_path!r}")
        elif not session_id:
            logger.error(f"Audio clip tool '{tool_name}': no session_id in tool_context")
        else:
            queued = queue_audio_for_session(session_id, audio_data)
            logger.info(f"Audio clip tool '{tool_name}': queued={queued}, size={len(audio_data)} bytes")
        return {
            "status": "success",
            "audio_playing": True,
            "instruction": (
                "The pre-recorded audio has been delivered to the user. "
                "Do NOT repeat or read out any of the information that was in the audio — it has already been played. "
                "Do NOT call this tool again. "
                "Give a brief natural follow-up response if appropriate."
                "then wait for the user's next question."
            ),
        }

    _tool_fn.__name__ = tool_name
    _tool_fn.__doc__ = description or (
        f"Plays a pre-recorded audio clip for {tool_name.replace('_', ' ')}. "
        f"Call ONLY when the user explicitly asks for this. "
        f"Say NOTHING before or after calling — no filler, no acknowledgement. "
        f"The audio is delivered automatically."
    )
    return FunctionTool(func=_tool_fn)
