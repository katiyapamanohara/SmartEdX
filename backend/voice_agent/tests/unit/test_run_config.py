"""Unit tests for app.adk.run_config_factory module."""

from app.adk.run_config_factory import build_run_config, build_sip_run_config


class TestBuildRunConfig:
    def test_native_audio_model_uses_audio_modality(self):
        config = build_run_config("gemini-2.5-flash-native-audio-preview-12-2025")
        assert "AUDIO" in config.response_modalities

    def test_half_cascade_model_uses_text_modality(self):
        config = build_run_config("gemini-2.0-flash")
        assert "TEXT" in config.response_modalities

    def test_native_audio_with_proactivity(self):
        config = build_run_config(
            "gemini-2.5-flash-native-audio-preview-12-2025",
            proactivity=True,
        )
        assert config.proactivity is not None

    def test_native_audio_with_affective_dialog(self):
        config = build_run_config(
            "gemini-2.5-flash-native-audio-preview-12-2025",
            affective_dialog=True,
        )
        assert config.enable_affective_dialog is True

    def test_half_cascade_ignores_proactivity(self):
        config = build_run_config("gemini-2.0-flash", proactivity=True)
        assert config.proactivity is None

    def test_half_cascade_ignores_affective_dialog(self):
        config = build_run_config("gemini-2.0-flash", affective_dialog=True)
        assert config.enable_affective_dialog is None


class TestBuildSipRunConfig:
    def test_sip_config_uses_audio_modality(self):
        config = build_sip_run_config()
        assert "AUDIO" in config.response_modalities

    def test_sip_config_has_transcription(self):
        config = build_sip_run_config()
        assert config.input_audio_transcription is not None
        assert config.output_audio_transcription is not None
