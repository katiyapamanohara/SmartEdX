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
        start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_HIGH,
        end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_HIGH,
        prefix_padding_ms=100,
        silence_duration_ms=180, # Dropped from 300 to 150ms for lightning-fast turn taking
    )
)

def build_run_config(
    model_name: str,
    *,
    proactivity: bool = False,
    affective_dialog: bool = False,
) -> RunConfig:
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
            # Always set explicitly — leaving None defaults to proactive_audio=True in Gemini Live,
            # which causes the model to spontaneously speak after ~30s of user silence.
            proactivity=types.ProactivityConfig(proactive_audio=proactivity),
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
    return run_config

def build_sip_run_config() -> RunConfig:
    return RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        speech_config=_make_speech_config(AGENT_VOICE),
        realtime_input_config=_VAD_CONFIG,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        proactivity=types.ProactivityConfig(proactive_audio=False),
    )
