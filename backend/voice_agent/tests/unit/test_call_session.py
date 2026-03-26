"""Unit tests for app.transport.sip_udp.call_session module."""

from app.audio.codec import AudioCodec, CodecType
from app.transport.sip_udp.call_session import SIPCallInfo


class TestSIPCallInfo:
    def test_default_values(self):
        ci = SIPCallInfo(
            call_id="test-123",
            from_tag="from",
            to_tag="to",
            remote_addr=("127.0.0.1", 5060),
            remote_rtp_addr=("127.0.0.1", 20000),
            codec=AudioCodec(CodecType.ULAW),
            user_id="user-1",
            session_id="session-1",
        )
        assert ci.call_id == "test-123"
        assert ci.is_active is False
        assert ci.end_call_requested is False
        assert ci.bye_sent is False
        assert ci.playback_active is False
        assert ci.audio_suppressed is False
        assert ci.interrupt_active is False
        assert ci.user_turn_count == 0
        assert ci.rtp_frame_count == 0
        assert ci.rtp_sequence == 0
        assert ci.flushing_silence is False
        assert ci.live_request_queue is None
        assert ci.adk_task is None
        assert ci.rtp_pacing_task is None
        assert ci.core_session_id is None
        assert ci.transcript_handler is None

    def test_rtp_output_queue_created(self):
        ci = SIPCallInfo(
            call_id="test",
            from_tag="f",
            to_tag="t",
            remote_addr=("127.0.0.1", 5060),
            remote_rtp_addr=None,
            codec=AudioCodec(CodecType.ULAW),
            user_id="u",
            session_id="s",
        )
        assert ci.rtp_output_queue is not None
        assert ci.rtp_output_queue.empty()

    def test_rtp_ssrc_is_positive(self):
        ci = SIPCallInfo(
            call_id="test",
            from_tag="f",
            to_tag="t",
            remote_addr=("127.0.0.1", 5060),
            remote_rtp_addr=None,
            codec=AudioCodec(CodecType.ALAW),
            user_id="u",
            session_id="s",
        )
        assert ci.rtp_ssrc > 0
