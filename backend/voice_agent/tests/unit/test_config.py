"""Unit tests for app.config module."""


class TestConfig:
    """Test centralized configuration loading."""

    def test_app_name_default(self):
        from app.config import APP_NAME

        assert APP_NAME == "voice-agent"

    def test_sip_port_default(self):
        from app.config import SIP_PORT

        assert isinstance(SIP_PORT, int)
        assert SIP_PORT == 5060

    def test_sip_sdp_port_default(self):
        from app.config import SIP_SDP_PORT

        assert isinstance(SIP_SDP_PORT, int)
        assert SIP_SDP_PORT == 20000

    def test_hard_mute_seconds_default(self):
        from app.config import HARD_MUTE_SECONDS

        assert isinstance(HARD_MUTE_SECONDS, float)
        assert HARD_MUTE_SECONDS == 2.5

    def test_sip_audio_gain_default(self):
        from app.config import SIP_AUDIO_GAIN

        assert isinstance(SIP_AUDIO_GAIN, float)

    def test_langfuse_disabled_by_default(self):
        from app.config import LANGFUSE_ENABLED

        assert LANGFUSE_ENABLED is False

    def test_custom_tools_disabled_by_default(self):
        from app.config import CUSTOM_TOOLS_ENABLED

        assert CUSTOM_TOOLS_ENABLED is False

    def test_qdrant_kb_is_boolean(self):
        from app.config import QDRANT_KB_ENABLED

        assert isinstance(QDRANT_KB_ENABLED, bool)

    def test_interrupt_timeout_seconds(self):
        from app.config import INTERRUPT_TIMEOUT_SECONDS

        assert INTERRUPT_TIMEOUT_SECONDS > 0

    def test_min_user_turns_before_end_call(self):
        from app.config import MIN_USER_TURNS_BEFORE_END_CALL

        assert MIN_USER_TURNS_BEFORE_END_CALL >= 0
