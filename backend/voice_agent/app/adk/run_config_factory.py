"""RunConfig builder for different model architectures."""

import logging

from google.adk.agents.run_config import RunConfig, StreamingMode, ToolThreadPoolConfig
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
        # LOW end sensitivity waits for more definitive silence before declaring end-of-turn,
        # preventing the VAD from getting stuck when there's background noise or breathing.
        end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_LOW,
        prefix_padding_ms=800,
        # 600ms gives enough silence buffer for natural speech patterns without a noisy environment
        # preventing end-of-turn from ever triggering.
        silence_duration_ms=1,
    )
)

# Run tools in a thread pool so the audio event loop is never blocked during
# Qdrant searches or embedding inference — interruptions stay instant.
_TOOL_THREAD_POOL = ToolThreadPoolConfig(max_workers=4)


def build_run_config(
    model_name: str,
    *,
    proactivity: bool = False,
    affective_dialog: bool = True,
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
            proactivity=types.ProactivityConfig(proactive_audio=proactivity),
            enable_affective_dialog=affective_dialog if affective_dialog else None,
            tool_thread_pool_config=_TOOL_THREAD_POOL,
            context_window_compression=types.ContextWindowCompressionConfig(
                trigger_tokens=8000,
                sliding_window=types.SlidingWindow(target_tokens=4000),
            ),
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
            tool_thread_pool_config=_TOOL_THREAD_POOL,
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
        tool_thread_pool_config=_TOOL_THREAD_POOL,
        context_window_compression=types.ContextWindowCompressionConfig(
            trigger_tokens=8000,
            sliding_window=types.SlidingWindow(target_tokens=4000),
        ),
    )
