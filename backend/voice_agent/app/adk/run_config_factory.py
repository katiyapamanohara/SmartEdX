"""RunConfig builder for different model architectures."""

import logging

from google.adk.agents.run_config import RunConfig, StreamingMode
from google.genai import types

from app.config import AGENT_VOICE

logger = logging.getLogger(__name__)


def _make_speech_config(voice_name: str) -> types.SpeechConfig:
    return types.SpeechConfig(
        voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name))
    )


_VAD_CONFIG = types.RealtimeInputConfig(
    automatic_activity_detection=types.AutomaticActivityDetection(
        # HIGH start sensitivity = model detects student speaking quickly →
        # faster barge-in so the student can interrupt the AI mid-sentence.
        start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_HIGH,
        # LOW end sensitivity = wait longer before deciding the student has
        # finished speaking, giving them time to think between sentences.
        end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_LOW,
        prefix_padding_ms=200,
        silence_duration_ms=1200,
    )
)


def build_run_config(
    model_name: str,
    *,
    proactivity: bool = False,
    affective_dialog: bool = False,
) -> RunConfig:
    """Build a RunConfig based on the model architecture.

    Native audio models (containing "native-audio" in name) use AUDIO
    response modality with transcription.  Half-cascade models use TEXT.

    Args:
        model_name: The Gemini model identifier.
        proactivity: Enable proactive audio (native audio only).
        affective_dialog: Enable affective dialog (native audio only).

    Returns:
        Configured RunConfig for ``runner.run_live()``.
    """
    is_native_audio = "native-audio" in model_name.lower()

    if is_native_audio:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["AUDIO"],
            speech_config=_make_speech_config(AGENT_VOICE),
            realtime_input_config=_VAD_CONFIG,
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            session_resumption=types.SessionResumptionConfig(),
            proactivity=(types.ProactivityConfig(proactive_audio=True) if proactivity else None),
            enable_affective_dialog=affective_dialog if affective_dialog else None,
        )
        logger.debug(
            f"Native audio model: {model_name}, AUDIO modality, "
            f"proactivity={proactivity}, affective_dialog={affective_dialog}"
        )
    else:
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=["TEXT"],
            input_audio_transcription=None,
            output_audio_transcription=None,
            session_resumption=types.SessionResumptionConfig(),
        )
        logger.debug(f"Half-cascade model: {model_name}, TEXT modality")
        if proactivity or affective_dialog:
            logger.warning(
                f"Proactivity and affective dialog only supported on native "
                f"audio models. Current model: {model_name}. Ignored."
            )
    return run_config


def build_sip_run_config() -> RunConfig:
    """Build a RunConfig for SIP transports (always native audio BIDI)."""
    return RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        speech_config=_make_speech_config(AGENT_VOICE),
        realtime_input_config=_VAD_CONFIG,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
    )
