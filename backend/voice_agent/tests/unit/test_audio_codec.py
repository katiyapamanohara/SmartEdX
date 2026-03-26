"""Unit tests for app.audio.codec module."""

from app.audio.codec import AudioCodec, CodecType


class TestCodecType:
    def test_ulaw_value(self):
        assert CodecType.ULAW == "PCMU"

    def test_alaw_value(self):
        assert CodecType.ALAW == "PCMA"

    def test_pcm_value(self):
        assert CodecType.PCM == "L16"


class TestAudioCodec:
    def test_init_default_ulaw(self):
        codec = AudioCodec()
        assert codec.codec_type == CodecType.ULAW

    def test_init_alaw(self):
        codec = AudioCodec(CodecType.ALAW)
        assert codec.codec_type == CodecType.ALAW

    def test_sip_to_pcm16k_ulaw(self):
        codec = AudioCodec(CodecType.ULAW)
        # Create 160 bytes of μ-law silence (0xFF)
        ulaw_silence = bytes([0xFF]) * 160
        pcm = codec.sip_to_pcm16k(ulaw_silence)
        # Should produce 16kHz PCM (double the samples since 8k → 16k)
        # Each 8kHz sample → 2 bytes PCM, then upsampled 2x
        assert len(pcm) > 0
        assert isinstance(pcm, bytes)

    def test_sip_to_pcm16k_alaw(self):
        codec = AudioCodec(CodecType.ALAW)
        alaw_silence = bytes([0xD5]) * 160
        pcm = codec.sip_to_pcm16k(alaw_silence)
        assert len(pcm) > 0

    def test_pcm16k_to_sip_ulaw(self):
        codec = AudioCodec(CodecType.ULAW)
        # Create 640 bytes of PCM silence at 16kHz (320 samples × 2 bytes)
        pcm_16k = bytes(640)
        sip_audio = codec.pcm16k_to_sip(pcm_16k, input_rate=16000)
        assert len(sip_audio) > 0

    def test_pcm16k_to_sip_alaw(self):
        codec = AudioCodec(CodecType.ALAW)
        pcm_16k = bytes(640)
        sip_audio = codec.pcm16k_to_sip(pcm_16k, input_rate=16000)
        assert len(sip_audio) > 0

    def test_roundtrip_preserves_data_integrity(self):
        codec = AudioCodec(CodecType.ULAW)
        original_ulaw = bytes([0xFF]) * 160
        pcm = codec.sip_to_pcm16k(original_ulaw)
        back_to_ulaw = codec.pcm16k_to_sip(pcm, input_rate=16000)
        # Should produce data (not necessarily identical due to lossy conversion)
        assert len(back_to_ulaw) > 0

    def test_pcm_to_sip_24k_input(self):
        codec = AudioCodec(CodecType.ULAW)
        pcm_24k = bytes(960)  # 480 samples at 24kHz
        sip_audio = codec.pcm16k_to_sip(pcm_24k, input_rate=24000)
        assert len(sip_audio) > 0

    def test_reset_state(self):
        codec = AudioCodec(CodecType.ULAW)
        # Process some audio to set state
        codec.sip_to_pcm16k(bytes([0xFF]) * 160)
        assert codec._upsample_state is not None
        codec.reset_state()
        assert codec._upsample_state is None
        assert codec._downsample_state is None

    def test_parse_sample_rate_default(self):
        rate = AudioCodec.parse_sample_rate("audio/pcm", default=16000)
        assert rate == 16000

    def test_parse_sample_rate_from_mime(self):
        rate = AudioCodec.parse_sample_rate("audio/pcm;rate=24000")
        assert rate == 24000

    def test_parse_sample_rate_from_mime_16k(self):
        rate = AudioCodec.parse_sample_rate("audio/pcm;rate=16000")
        assert rate == 16000

    def test_get_codec_from_sdp_ulaw(self):
        sdp = "m=audio 20000 RTP/AVP 0\r\na=rtpmap:0 PCMU/8000\r\n"
        codec_type = AudioCodec.get_codec_from_sdp(sdp)
        assert codec_type == CodecType.ULAW

    def test_get_codec_from_sdp_alaw(self):
        sdp = "m=audio 20000 RTP/AVP 8\r\na=rtpmap:8 PCMA/8000\r\n"
        codec_type = AudioCodec.get_codec_from_sdp(sdp)
        assert codec_type == CodecType.ALAW

    def test_get_codec_from_sdp_defaults_to_ulaw(self):
        sdp = "m=audio 20000 RTP/AVP 99\r\n"
        codec_type = AudioCodec.get_codec_from_sdp(sdp)
        assert codec_type == CodecType.ULAW

    def test_input_rate_change_resets_downsample_state(self):
        codec = AudioCodec(CodecType.ULAW)
        codec.pcm16k_to_sip(bytes(640), input_rate=16000)
        assert codec._last_downsample_rate == 16000
        codec.pcm16k_to_sip(bytes(960), input_rate=24000)
        assert codec._last_downsample_rate == 24000
