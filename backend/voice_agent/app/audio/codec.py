"""Audio codec conversion utilities for SIP integration.

Handles conversion between:
- G.711 μ-law/a-law @ 8kHz (SIP standard)
- Linear PCM @ 16kHz (Google ADK requirement)
"""

import logging
from enum import Enum
from typing import Optional

import audioop

logger = logging.getLogger(__name__)


class CodecType(str, Enum):
    """Supported audio codec types."""

    ULAW = "PCMU"  # G.711 μ-law
    ALAW = "PCMA"  # G.711 a-law
    PCM = "L16"  # Linear PCM


class AudioCodec:
    """Audio codec converter for SIP telephony integration."""

    # RTP payload types (RFC 3551)
    PAYLOAD_TYPE_PCMU = 0  # G.711 μ-law
    PAYLOAD_TYPE_PCMA = 8  # G.711 a-law

    def __init__(self, codec_type: CodecType = CodecType.ULAW):
        self.codec_type = codec_type
        # Resampling state for continuous streaming (avoids clicks at chunk boundaries)
        self._upsample_state = None  # 8kHz → 16kHz (SIP inbound)
        self._downsample_state = None  # output → 8kHz (SIP outbound)
        self._last_downsample_rate = None
        logger.info(f"AudioCodec initialized with codec: {codec_type}")

    def reset_state(self) -> None:
        """Reset resampling state (call at start of new audio stream)."""
        self._upsample_state = None
        self._downsample_state = None
        self._last_downsample_rate = None

    def sip_to_pcm16k(self, sip_audio: bytes) -> bytes:
        """Convert SIP audio (G.711 @ 8kHz) to PCM @ 16kHz.

        Args:
            sip_audio: G.711 encoded audio at 8kHz

        Returns:
            Linear PCM audio at 16kHz, 16-bit, mono
        """
        try:
            # Step 1: Decode G.711 to linear PCM @ 8kHz
            if self.codec_type == CodecType.ULAW:
                pcm_8k = audioop.ulaw2lin(sip_audio, 2)
            elif self.codec_type == CodecType.ALAW:
                pcm_8k = audioop.alaw2lin(sip_audio, 2)
            else:
                raise ValueError(f"Unsupported codec: {self.codec_type}")

            # Step 2: Resample 8kHz → 16kHz (stateful for seamless streaming)
            pcm_16k, self._upsample_state = audioop.ratecv(pcm_8k, 2, 1, 8000, 16000, self._upsample_state)

            logger.debug(
                f"Converted SIP audio: {len(sip_audio)}B (8kHz {self.codec_type}) -> {len(pcm_16k)}B (16kHz PCM)"
            )
            return pcm_16k
        except Exception as e:
            logger.error(f"Error converting SIP to PCM: {e}", exc_info=True)
            raise

    def pcm16k_to_sip(self, pcm_audio: bytes, input_rate: int = 16000) -> bytes:
        """Convert PCM audio to SIP audio (G.711 @ 8kHz).

        Args:
            pcm_audio: Linear PCM audio, 16-bit, mono
            input_rate: Sample rate of the input PCM (default 16000,
                        Gemini native audio models output 24000)

        Returns:
            G.711 encoded audio at 8kHz
        """
        try:
            # Reset downsample state if the input rate changed
            if self._last_downsample_rate is not None and self._last_downsample_rate != input_rate:
                self._downsample_state = None
                logger.info(f"Input rate changed {self._last_downsample_rate} -> {input_rate}, reset state")
            self._last_downsample_rate = input_rate

            # Step 1: Resample to 8kHz
            if input_rate == 8000:
                pcm_8k = pcm_audio
            else:
                pcm_8k, self._downsample_state = audioop.ratecv(
                    pcm_audio, 2, 1, input_rate, 8000, self._downsample_state
                )

            # Step 2: Encode linear PCM to G.711
            if self.codec_type == CodecType.ULAW:
                sip_audio = audioop.lin2ulaw(pcm_8k, 2)
            elif self.codec_type == CodecType.ALAW:
                sip_audio = audioop.lin2alaw(pcm_8k, 2)
            else:
                raise ValueError(f"Unsupported codec: {self.codec_type}")

            logger.debug(
                f"Converted PCM audio: {len(pcm_audio)}B ({input_rate}Hz PCM) "
                f"-> {len(sip_audio)}B (8kHz {self.codec_type})"
            )
            return sip_audio
        except Exception as e:
            logger.error(f"Error converting PCM to SIP: {e}", exc_info=True)
            raise

    @staticmethod
    def parse_sample_rate(mime_type: str, default: int = 24000) -> int:
        """Parse sample rate from a MIME type string.

        Args:
            mime_type: e.g. 'audio/pcm;rate=24000' or 'audio/pcm'
            default: fallback rate when none is specified

        Returns:
            Integer sample rate in Hz
        """
        if mime_type and "rate=" in mime_type:
            try:
                rate_str = mime_type.split("rate=")[1].split(";")[0].split(",")[0].strip()
                return int(rate_str)
            except (ValueError, IndexError):
                pass
        return default

    @staticmethod
    def get_codec_from_sdp(sdp: str) -> Optional[CodecType]:
        """Extract codec type from SDP (Session Description Protocol).

        Args:
            sdp: SDP message content

        Returns:
            Detected codec type, or None if not found
        """
        try:
            for line in sdp.split("\n"):
                line = line.strip()
                if line.startswith("a=rtpmap:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        codec_name = parts[1].split("/")[0].upper()
                        if codec_name == "PCMU":
                            logger.info("Detected G.711 μ-law codec from SDP")
                            return CodecType.ULAW
                        elif codec_name == "PCMA":
                            logger.info("Detected G.711 a-law codec from SDP")
                            return CodecType.ALAW

            logger.warning("Codec not found in SDP, defaulting to PCMU")
            return CodecType.ULAW
        except Exception as e:
            logger.error(f"Error parsing SDP: {e}", exc_info=True)
            return CodecType.ULAW
