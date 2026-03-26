"""RTP packet parser and generator for SIP audio streaming.

RTP (Real-time Transport Protocol) - RFC 3550
"""

import logging
import struct
from typing import Tuple

logger = logging.getLogger(__name__)


class RTPPacket:
    """RTP packet structure and parser."""

    RTP_HEADER_SIZE = 12

    def __init__(
        self, payload_type: int = 0, sequence_number: int = 0, timestamp: int = 0, ssrc: int = 0, payload: bytes = b""
    ):
        self.version = 2
        self.padding = 0
        self.extension = 0
        self.csrc_count = 0
        self.marker = 0
        self.payload_type = payload_type
        self.sequence_number = sequence_number
        self.timestamp = timestamp
        self.ssrc = ssrc
        self.payload = payload

    @classmethod
    def parse(cls, data: bytes) -> "RTPPacket":
        if len(data) < cls.RTP_HEADER_SIZE:
            raise ValueError(f"RTP packet too small: {len(data)} bytes")

        byte0, byte1, seq, ts, ssrc = struct.unpack("!BBHII", data[:12])

        version = (byte0 >> 6) & 0x03
        padding = (byte0 >> 5) & 0x01
        extension = (byte0 >> 4) & 0x01
        csrc_count = byte0 & 0x0F

        marker = (byte1 >> 7) & 0x01
        payload_type = byte1 & 0x7F

        if version != 2:
            raise ValueError(f"Unsupported RTP version: {version}")

        header_size = 12 + (csrc_count * 4)

        if extension:
            if len(data) < header_size + 4:
                raise ValueError("RTP extension header incomplete")
            ext_len = struct.unpack("!H", data[header_size + 2 : header_size + 4])[0]
            header_size += 4 + (ext_len * 4)

        payload = data[header_size:]

        if padding and len(payload) > 0:
            padding_len = payload[-1]
            payload = payload[:-padding_len]

        packet = cls(payload_type=payload_type, sequence_number=seq, timestamp=ts, ssrc=ssrc, payload=payload)
        packet.version = version
        packet.padding = padding
        packet.extension = extension
        packet.csrc_count = csrc_count
        packet.marker = marker

        return packet

    def to_bytes(self) -> bytes:
        byte0 = (self.version << 6) | (self.padding << 5) | (self.extension << 4) | self.csrc_count
        byte1 = (self.marker << 7) | self.payload_type

        header = struct.pack(
            "!BBHII", byte0, byte1, self.sequence_number & 0xFFFF, self.timestamp & 0xFFFFFFFF, self.ssrc & 0xFFFFFFFF
        )
        return header + self.payload

    def __repr__(self) -> str:
        return (
            f"<RTPPacket PT={self.payload_type} seq={self.sequence_number} "
            f"ts={self.timestamp} payload={len(self.payload)}B>"
        )


def parse_rtp_packet(data: bytes) -> Tuple[bytes, int, int]:
    """Parse RTP packet and extract audio payload.

    Returns:
        Tuple of (payload, sequence_number, timestamp)
    """
    try:
        packet = RTPPacket.parse(data)
        return packet.payload, packet.sequence_number, packet.timestamp
    except Exception as e:
        logger.warning(f"Failed to parse RTP packet: {e}, treating as raw audio")
        return data, 0, 0


def create_rtp_packet(
    payload: bytes, sequence_number: int, timestamp: int, payload_type: int = 0, ssrc: int = 0
) -> bytes:
    """Create RTP packet with audio payload."""
    packet = RTPPacket(
        payload_type=payload_type, sequence_number=sequence_number, timestamp=timestamp, ssrc=ssrc, payload=payload
    )
    return packet.to_bytes()
