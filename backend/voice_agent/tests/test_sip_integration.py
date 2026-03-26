"""Test SIP integration."""

import logging

import pytest
from fastapi.testclient import TestClient

# Configure logging
logging.basicConfig(level=logging.DEBUG)


@pytest.mark.asyncio
async def test_sip_websocket_connection():
    """Test SIP WebSocket endpoint accepts connections."""
    from app.main import app

    with TestClient(app) as client:
        with client.websocket_connect("/sip") as websocket:
            # Send mock INVITE
            invite = """INVITE sip:agent@localhost SIP/2.0
Via: SIP/2.0/WSS provider.com;branch=z9hG4bK776asdhds
From: <sip:+15551234567@provider.com>;tag=1928301774
To: <sip:agent@localhost>
Call-ID: a84b4c76e66710@provider.com
CSeq: 314159 INVITE
Contact: <sip:+15551234567@provider.com>
Content-Type: application/sdp
Content-Length: 142

v=0
o=- 0 0 IN IP4 192.0.2.1
s=Test Call
c=IN IP4 192.0.2.1
t=0 0
m=audio 49170 RTP/AVP 0
a=rtpmap:0 PCMU/8000
"""
            websocket.send_text(invite)

            # Should receive 100 Trying
            response = websocket.receive_text()
            assert "100 Trying" in response

            # Should receive 200 OK
            response = websocket.receive_text()
            assert "200 OK" in response
            assert "application/sdp" in response


def test_audio_codec_conversion():
    """Test audio codec conversion."""

    from app.audio import AudioCodec, CodecType

    # Generate test PCM audio (1 second @ 16kHz)
    sample_rate = 16000
    duration = 1.0
    num_samples = int(sample_rate * duration)

    # Generate sine wave
    import math

    frequency = 440.0  # A4 note
    pcm_16k = bytes(
        [
            int((math.sin(2 * math.pi * frequency * i / sample_rate) * 32767) % 256)
            for i in range(num_samples * 2)  # 2 bytes per sample
        ]
    )

    # Test μ-law conversion
    codec = AudioCodec(CodecType.ULAW)

    # Convert PCM -> G.711 -> PCM
    sip_audio = codec.pcm16k_to_sip(pcm_16k)
    assert len(sip_audio) == len(pcm_16k) // 4  # 8kHz is half, compression is ~2x

    pcm_recovered = codec.sip_to_pcm16k(sip_audio)
    # audioop.ratecv stateful resampling can round by a few bytes
    assert abs(len(pcm_recovered) - len(pcm_16k)) <= 4


def test_sip_message_parser():
    """Test SIP message parsing."""
    from app.sip import SIPMessage, SIPResponseBuilder

    # Test INVITE parsing
    invite_text = """INVITE sip:agent@localhost SIP/2.0
Via: SIP/2.0/WSS provider.com;branch=z9hG4bK776asdhds
From: <sip:+15551234567@provider.com>;tag=1928301774
To: <sip:agent@localhost>
Call-ID: a84b4c76e66710@provider.com
CSeq: 314159 INVITE
Contact: <sip:+15551234567@provider.com>
Content-Type: application/sdp
Content-Length: 50

v=0
o=- 0 0 IN IP4 192.0.2.1
s=Test
"""

    sip_msg = SIPMessage(invite_text)

    assert sip_msg.is_request
    assert sip_msg.method == "INVITE"
    assert sip_msg.get_call_id() == "a84b4c76e66710@provider.com"
    assert sip_msg.get_from_tag() == "1928301774"
    assert sip_msg.get_header("CSeq") == "314159 INVITE"
    assert "v=0" in sip_msg.body

    # Test response building
    response = SIPResponseBuilder.build_response(sip_msg, 200, "OK", body="Test Body")

    assert "SIP/2.0 200 OK" in response
    assert "Call-ID: a84b4c76e66710@provider.com" in response
    assert "tag=" in response  # Should add To tag
    assert "Test Body" in response


def test_codec_detection_from_sdp():
    """Test codec detection from SDP."""
    from app.audio import AudioCodec, CodecType

    # Test PCMU detection
    sdp_ulaw = """v=0
o=- 0 0 IN IP4 192.0.2.1
s=Test
m=audio 49170 RTP/AVP 0
a=rtpmap:0 PCMU/8000
"""
    codec = AudioCodec.get_codec_from_sdp(sdp_ulaw)
    assert codec == CodecType.ULAW

    # Test PCMA detection
    sdp_alaw = """v=0
o=- 0 0 IN IP4 192.0.2.1
s=Test
m=audio 49170 RTP/AVP 8
a=rtpmap:8 PCMA/8000
"""
    codec = AudioCodec.get_codec_from_sdp(sdp_alaw)
    assert codec == CodecType.ALAW
