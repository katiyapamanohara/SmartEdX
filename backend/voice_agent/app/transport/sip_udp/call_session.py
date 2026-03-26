"""Per-call state and data structures for native SIP/UDP sessions."""

import asyncio
import os
from dataclasses import dataclass, field
from typing import Optional, Tuple

from google.adk.agents.live_request_queue import LiveRequestQueue

from app.audio import AudioCodec, CodecType
from app.transcription import TranscriptHandler


@dataclass
class SIPCallInfo:
    """Information about an active SIP call."""

    call_id: str
    from_tag: str
    to_tag: str
    remote_addr: Tuple[str, int]
    remote_rtp_addr: Optional[Tuple[str, int]] = None
    codec: AudioCodec = field(default_factory=lambda: AudioCodec(CodecType.ULAW))
    user_id: str = ""
    session_id: str = ""
    live_request_queue: Optional[LiveRequestQueue] = None
    is_active: bool = False
    audio_suppressed: bool = False
    rtp_sequence: int = 0
    rtp_timestamp: int = 0
    rtp_ssrc: int = field(default_factory=lambda: int.from_bytes(os.urandom(4), "big"))
    adk_task: Optional[asyncio.Task] = None
    last_agent_audio_ts: float = 0.0
    interrupt_active: bool = False
    saw_user_input_finished: bool = False
    hard_mute_until: float = 0.0
    flushing_silence: bool = False
    rtp_output_queue: asyncio.Queue = field(default_factory=asyncio.Queue)
    rtp_pacing_task: Optional[asyncio.Task] = None
    audio_inject_task: Optional[asyncio.Task] = None
    clip_audio_suppressed: bool = False  # separate from interrupt-driven audio_suppressed
    playback_active: bool = False
    rtp_frame_count: int = 0
    interrupt_active_since: float = 0.0
    last_interrupt_ts: float = 0.0
    end_call_requested: bool = False
    end_call_requested_at: float = 0.0
    bye_sent: bool = False
    user_turn_count: int = 0
    transcript_handler: Optional[TranscriptHandler] = None
    core_session_id: Optional[str] = None
    greeting_done: bool = False
    greeting_audio_queued: bool = False
