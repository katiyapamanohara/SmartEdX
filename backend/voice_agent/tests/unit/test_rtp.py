"""Unit tests for app.sip.rtp module."""

import struct

import pytest

from app.sip.rtp import RTPPacket, create_rtp_packet, parse_rtp_packet


def _make_rtp_bytes(
    payload: bytes = b"\x00" * 160,
    seq: int = 1,
    ts: int = 160,
    ssrc: int = 12345,
    payload_type: int = 0,
) -> bytes:
    """Build a minimal RTP packet."""
    byte0 = 0x80  # version=2, no padding/extension/CSRC
    byte1 = payload_type & 0x7F
    header = struct.pack("!BBHII", byte0, byte1, seq, ts, ssrc)
    return header + payload


class TestRTPPacket:
    def test_parse_valid_packet(self):
        data = _make_rtp_bytes(seq=42, ts=3360, ssrc=99)
        pkt = RTPPacket.parse(data)
        assert pkt.sequence_number == 42
        assert pkt.timestamp == 3360
        assert pkt.ssrc == 99
        assert pkt.payload_type == 0
        assert len(pkt.payload) == 160

    def test_parse_too_small(self):
        with pytest.raises(ValueError, match="too small"):
            RTPPacket.parse(b"\x00" * 5)

    def test_parse_wrong_version(self):
        data = bytearray(_make_rtp_bytes())
        data[0] = 0x00  # version = 0
        with pytest.raises(ValueError, match="version"):
            RTPPacket.parse(bytes(data))

    def test_parse_with_marker_bit(self):
        data = bytearray(_make_rtp_bytes(payload_type=0))
        data[1] = 0x80  # marker=1, PT=0
        pkt = RTPPacket.parse(bytes(data))
        assert pkt.marker == 1
        assert pkt.payload_type == 0

    def test_to_bytes(self):
        pkt = RTPPacket(payload_type=0, sequence_number=10, timestamp=1600, ssrc=555, payload=b"\xff" * 160)
        raw = pkt.to_bytes()
        assert len(raw) == 12 + 160

        # Parse it back
        parsed = RTPPacket.parse(raw)
        assert parsed.sequence_number == 10
        assert parsed.timestamp == 1600
        assert parsed.ssrc == 555
        assert parsed.payload == b"\xff" * 160


class TestHelperFunctions:
    def test_parse_rtp_packet(self):
        data = _make_rtp_bytes(seq=5, ts=800, payload=b"\xaa" * 80)
        payload, seq, ts = parse_rtp_packet(data)
        assert seq == 5
        assert ts == 800
        assert payload == b"\xaa" * 80

    def test_create_rtp_packet(self):
        raw = create_rtp_packet(
            payload=b"\xff" * 160,
            sequence_number=100,
            timestamp=16000,
            payload_type=0,
            ssrc=42,
        )
        assert len(raw) == 12 + 160
        # Verify by parsing
        payload, seq, ts = parse_rtp_packet(raw)
        assert seq == 100
        assert ts == 16000
        assert payload == b"\xff" * 160

    def test_create_rtp_packet_alaw(self):
        raw = create_rtp_packet(
            payload=b"\xd5" * 160,
            sequence_number=200,
            timestamp=32000,
            payload_type=8,
            ssrc=99,
        )
        pkt = RTPPacket.parse(raw)
        assert pkt.payload_type == 8
        assert pkt.sequence_number == 200
