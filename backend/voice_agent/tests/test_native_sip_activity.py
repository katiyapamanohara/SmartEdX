"""Test that native SIP handler correctly manages the audio lifecycle.

With the switch to Google ADK built-in VAD (automatic activity detection),
these tests validate:
1. Audio is always forwarded to ADK for processing.
2. Timeout-based recovery clears stuck interrupt_active flags.
3. Audio forwarding works regardless of suppression state.
"""

import os
import struct
import time
from typing import List
from unittest.mock import MagicMock

import pytest

os.environ["SIP_AUDIO_GAIN"] = "1.0"
os.environ["SILENCE_END_FRAMES"] = "3"
os.environ["INTERRUPT_TIMEOUT_SECONDS"] = "2.0"

from app.audio import AudioCodec, CodecType
from app.config import INTERRUPT_TIMEOUT_SECONDS
from app.transport.sip_udp.call_session import SIPCallInfo
from app.transport.sip_udp.server import NativeSIPServer


def make_call_info(call_id="test-call-123") -> SIPCallInfo:
    ci = SIPCallInfo(
        call_id=call_id,
        from_tag="from-tag",
        to_tag="to-tag",
        remote_addr=("127.0.0.1", 5060),
        remote_rtp_addr=("127.0.0.1", 20000),
        codec=AudioCodec(CodecType.ULAW),
        user_id="test-user",
        session_id="test-session",
    )
    ci.is_active = True
    ci.greeting_done = True
    ci.greeting_audio_queued = True
    ci.live_request_queue = MagicMock()
    ci.live_request_queue.send_realtime = MagicMock()
    ci.live_request_queue.send_content = MagicMock()
    return ci


def make_rtp_packet(payload: bytes, seq: int = 1, ssrc: int = 12345) -> bytes:
    byte0 = 0x80
    byte1 = 0
    ts = seq * 160
    header = struct.pack("!BBHII", byte0, byte1, seq, ts, ssrc)
    return header + payload


def generate_speech_payload(num_frames: int) -> List[bytes]:
    import math

    import audioop

    frames = []
    for i in range(num_frames):
        pcm = b""
        for s in range(160):
            val = int(16000 * math.sin(2 * math.pi * 440 * s / 8000))
            pcm += struct.pack("<h", val)
        ulaw = audioop.lin2ulaw(pcm, 2)
        frames.append(ulaw)
    return frames


def generate_silence_payload(num_frames: int) -> List[bytes]:
    return [bytes([0xFF]) * 160 for _ in range(num_frames)]


RTP_ADDR = ("127.0.0.1", 20000)


@pytest.fixture
def sip_server():
    server = NativeSIPServer.__new__(NativeSIPServer)
    server.runner = MagicMock()
    server.session_service = MagicMock()
    server.app_name = "test-app"
    server.calls = {}
    server.rtp_addr_to_call = {}
    server.sip_transport = None
    server.rtp_transport = MagicMock()
    return server


async def send_rtp_frames(sip_server, call_info, frames, start_seq=1):
    if call_info.call_id not in sip_server.calls:
        sip_server.calls[call_info.call_id] = call_info
        sip_server.rtp_addr_to_call[RTP_ADDR] = call_info.call_id
    for i, payload in enumerate(frames):
        pkt = make_rtp_packet(payload, seq=start_seq + i)
        await sip_server.handle_rtp_packet(pkt, RTP_ADDR)
    return start_seq + len(frames)


class TestAudioForwarding:
    """Audio is always forwarded to ADK -- ADK built-in VAD handles
    speech detection and barge-in automatically."""

    @pytest.mark.asyncio(loop_scope="function")
    async def test_audio_forwarded_to_adk(self, sip_server):
        call_info = make_call_info()
        await send_rtp_frames(sip_server, call_info, generate_speech_payload(5))
        assert call_info.live_request_queue.send_realtime.call_count >= 5

    @pytest.mark.asyncio(loop_scope="function")
    async def test_audio_forwarded_even_when_suppressed(self, sip_server):
        call_info = make_call_info()
        call_info.audio_suppressed = True
        call_info.interrupt_active = True
        await send_rtp_frames(sip_server, call_info, generate_speech_payload(5))
        assert call_info.live_request_queue.send_realtime.call_count >= 5

    @pytest.mark.asyncio(loop_scope="function")
    async def test_audio_not_forwarded_when_inactive(self, sip_server):
        call_info = make_call_info()
        call_info.is_active = False
        await send_rtp_frames(sip_server, call_info, generate_speech_payload(5))
        call_info.live_request_queue.send_realtime.assert_not_called()

    @pytest.mark.asyncio(loop_scope="function")
    async def test_silence_forwarded_to_adk(self, sip_server):
        call_info = make_call_info()
        await send_rtp_frames(sip_server, call_info, generate_silence_payload(10))
        assert call_info.live_request_queue.send_realtime.call_count >= 10


class TestInterruptTimeoutRecovery:
    """Timeout-based recovery clears stuck interrupt_active flags."""

    @pytest.mark.asyncio(loop_scope="function")
    async def test_timeout_clears_stuck_flags(self, sip_server):
        call_info = make_call_info()
        call_info.interrupt_active = True
        call_info.audio_suppressed = True
        call_info.interrupt_active_since = time.monotonic() - INTERRUPT_TIMEOUT_SECONDS - 1.0
        call_info.rtp_frame_count = 49
        await send_rtp_frames(sip_server, call_info, generate_silence_payload(2))
        assert call_info.interrupt_active is False
        assert call_info.audio_suppressed is False

    @pytest.mark.asyncio(loop_scope="function")
    async def test_no_false_timeout_when_recent(self, sip_server):
        call_info = make_call_info()
        call_info.interrupt_active = True
        call_info.audio_suppressed = True
        call_info.interrupt_active_since = time.monotonic()
        call_info.rtp_frame_count = 49
        await send_rtp_frames(sip_server, call_info, generate_silence_payload(2))
        assert call_info.interrupt_active is True
