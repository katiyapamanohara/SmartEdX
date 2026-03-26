"""WebSocket handler — browser-based bidirectional audio/text streaming."""

import asyncio
import base64
import json
import logging
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.adk.run_config_factory import build_run_config
from app.adk.session_manager import ADKSessionManager
from app.agent.audio_clips import (
    make_websocket_audio_event,
    register_session_audio_queue,
    unregister_session_audio_queue,
)
from app.config import ARTICOM_ASSISTANT_ID, AUDIO_CLIP_TOOL_MAP
from app.latency import latency
from app.observability.langfuse_client import observe_decorator, update_trace

logger = logging.getLogger(__name__)


@observe_decorator(name=f"Voice Agent Execution - {ARTICOM_ASSISTANT_ID}", as_type="generation")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
    runner: Runner,
    session_service: InMemorySessionService,
    transcript_store: dict,
    *,
    proactivity: bool = False,
    affective_dialog: bool = False,
    language: Optional[str] = None,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK."""
    await websocket.accept()

    model_name = runner.agent.model
    run_config = build_run_config(model_name, proactivity=proactivity, affective_dialog=affective_dialog)

    # Langfuse trace
    update_trace(
        tags=["voice-agent", "websocket", model_name, f"agent:{ARTICOM_ASSISTANT_ID}"],
        metadata={
            "proactivity": proactivity,
            "affective_dialog": affective_dialog,
            "response_modalities": run_config.response_modalities,
            "model": model_name,
            "user_id": user_id,
            "session_id": session_id,
        },
    )

    # Shared session lifecycle
    mgr = ADKSessionManager(
        runner=runner,
        session_service=session_service,
        transcript_store=transcript_store,
        user_id=user_id,
        session_id=session_id,
        is_sip=False,
        language=language,
    )
    live_request_queue = await mgr.initialize()
    t_first_response = latency.start_timer()
    first_response_recorded = False

    # Register audio clip queue for this session (no-op overhead if map is empty)
    audio_clip_queue = register_session_audio_queue(session_id) if AUDIO_CLIP_TOOL_MAP else None

    # ── Concurrent upstream / downstream tasks ──────────────────────

    async def upstream_task() -> None:
        """Receives messages from WebSocket and sends to LiveRequestQueue."""
        while True:
            try:
                message = await websocket.receive()
            except RuntimeError:
                break

            if "bytes" in message:
                audio_blob = types.Blob(mime_type="audio/pcm;rate=16000", data=message["bytes"])
                live_request_queue.send_realtime(audio_blob)

            elif "text" in message:
                json_message = json.loads(message["text"])

                if json_message.get("type") == "text":
                    user_text = json_message["text"]
                    content = types.Content(parts=[types.Part(text=user_text)])
                    live_request_queue.send_content(content)
                    mgr.transcript_handler.record_message("user", user_text)
                    mgr.transcript_handler.resume_agent_output()

                elif json_message.get("type") == "image":
                    image_data = base64.b64decode(json_message["data"])
                    mime_type = json_message.get("mimeType", "image/jpeg")
                    image_blob = types.Blob(mime_type=mime_type, data=image_data)
                    live_request_queue.send_realtime(image_blob)

    async def downstream_task() -> None:
        """Receives events from run_live() and sends to WebSocket."""
        nonlocal first_response_recorded
        # When an audio clip tool call is in flight, suppress model audio so the
        # model cannot speak filler ("let me check") over or after the clip.
        suppress_model_audio = False
        try:
            async for event in runner.run_live(
                user_id=user_id,
                session_id=session_id,
                live_request_queue=live_request_queue,
                run_config=run_config,
            ):
                if not first_response_recorded:
                    latency.stop_timer("first_response", t_first_response, session_id)
                    first_response_recorded = True

                event_json = event.model_dump_json(exclude_none=True, by_alias=True)

                if AUDIO_CLIP_TOOL_MAP:
                    try:
                        evt = json.loads(event_json)
                        parts = (evt.get("content") or {}).get("parts") or []
                        # Start suppressing when the model calls an audio clip tool
                        if any((p.get("functionCall") or {}).get("name") in AUDIO_CLIP_TOOL_MAP for p in parts):
                            suppress_model_audio = True
                            logger.debug(f"WS {session_id}: audio clip tool call detected — suppressing model audio")
                        # Stop suppressing at end of model turn
                        if suppress_model_audio and evt.get("usageMetadata"):
                            suppress_model_audio = False
                            logger.debug(f"WS {session_id}: turn complete — model audio suppression lifted")
                        # Strip inlineData (model speech) while suppression is active
                        if suppress_model_audio:
                            filtered = [p for p in parts if "inlineData" not in p]
                            if len(filtered) != len(parts):
                                if evt.get("content"):
                                    evt["content"]["parts"] = filtered
                                event_json = json.dumps(evt)
                    except Exception:
                        pass

                await websocket.send_text(event_json)

                if '"inlineData"' not in event_json or '"text"' in event_json:
                    mgr.transcript_handler.process_event(event_json)
        except Exception as e:
            logger.warning(f"WS {session_id}: Gemini live connection ended: {e}")
            try:
                await websocket.send_json({"type": "disconnect", "reason": str(e)})
            except Exception:
                logger.debug(f"WS {session_id}: could not send disconnect signal (socket already closed)")

    async def audio_clip_injection_task() -> None:
        """Drains the audio clip queue and sends each clip to the WebSocket."""
        assert audio_clip_queue is not None
        while True:
            try:
                pcm_bytes = await asyncio.wait_for(audio_clip_queue.get(), timeout=0.5)
                event_json = make_websocket_audio_event(pcm_bytes)
                await websocket.send_text(event_json)
                logger.debug(f"WS {session_id}: injected audio clip ({len(pcm_bytes)} bytes)")
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.debug(f"WS {session_id}: audio injection task ended: {e}")
                break

    tasks = [upstream_task(), downstream_task()]
    if audio_clip_queue is not None:
        tasks.append(audio_clip_injection_task())

    try:
        await asyncio.gather(*tasks)
    except WebSocketDisconnect:
        logger.debug("Client disconnected normally")
    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
    finally:
        if audio_clip_queue is not None:
            unregister_session_audio_queue(session_id)
        await mgr.finalize()
