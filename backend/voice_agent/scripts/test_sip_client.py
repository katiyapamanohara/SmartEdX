#!/usr/bin/env python3
"""Simple SIP-over-WebSocket test client for local testing.

This script simulates a SIP provider sending an INVITE message
and audio data to test the SIP integration locally.
"""

import asyncio
import logging
import math
import sys

import audioop
import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def generate_test_audio_pcmu(duration: float = 2.0, frequency: float = 440.0) -> bytes:
    """Generate test audio in G.711 μ-law format.

    Args:
        duration: Duration in seconds
        frequency: Tone frequency in Hz (default: 440 Hz A4 note)

    Returns:
        G.711 μ-law encoded audio @ 8kHz
    """
    sample_rate = 8000
    num_samples = int(sample_rate * duration)

    # Generate sine wave PCM @ 8kHz
    pcm_samples = []
    for i in range(num_samples):
        sample = int(32767 * math.sin(2 * math.pi * frequency * i / sample_rate))
        # Convert to 16-bit little-endian bytes
        pcm_samples.append(sample.to_bytes(2, byteorder="little", signed=True))

    pcm_audio = b"".join(pcm_samples)

    # Convert to G.711 μ-law
    ulaw_audio = audioop.lin2ulaw(pcm_audio, 2)

    logger.info(f"Generated {len(ulaw_audio)} bytes of G.711 μ-law test audio " f"({duration}s @ {frequency}Hz)")
    return ulaw_audio


def create_sip_invite() -> str:
    """Create a SIP INVITE message for testing."""
    # SIP requires CRLF (\r\n) line endings, not just \n
    invite_lines = [
        "INVITE sip:agent@localhost:8000 SIP/2.0",
        "Via: SIP/2.0/WSS localhost:8000;branch=z9hG4bKtest123",
        "From: <sip:+15551234567@test.com>;tag=test-tag-12345",
        "To: <sip:agent@localhost:8000>",
        "Call-ID: test-call-id-67890@localhost",
        "CSeq: 1 INVITE",
        "Contact: <sip:+15551234567@test.com>",
        "Content-Type: application/sdp",
        "Content-Length: 143",
        "",  # Empty line before body
        "v=0",
        "o=- 0 0 IN IP4 127.0.0.1",
        "s=Test Call",
        "c=IN IP4 127.0.0.1",
        "t=0 0",
        "m=audio 20000 RTP/AVP 0",
        "a=rtpmap:0 PCMU/8000",
        "a=sendrecv",
        "",  # Final empty line
    ]
    return "\r\n".join(invite_lines)


async def test_sip_endpoint(url: str = "ws://localhost:8000/sip", send_audio: bool = True):
    """Test the SIP WebSocket endpoint.

    Args:
        url: WebSocket URL to connect to
        send_audio: Whether to send test audio after INVITE
    """
    logger.info(f"Connecting to {url}")

    try:
        async with websockets.connect(url) as websocket:
            logger.info("✓ Connected to SIP endpoint")

            # Send INVITE
            invite = create_sip_invite()
            logger.info("→ Sending SIP INVITE")
            await websocket.send(invite)

            # Receive 100 Trying
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            logger.info(f"← Received: {response[:50]}...")

            if "100 Trying" not in response:
                logger.warning("Expected '100 Trying' response")
            else:
                logger.info("✓ Received 100 Trying")

            # Receive 200 OK
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            logger.info(f"← Received: {response[:100]}...")

            if "200 OK" not in response:
                logger.error("Expected '200 OK' response")
                return

            logger.info("✓ Received 200 OK with SDP")

            # Parse SDP from response
            if "application/sdp" in response and "v=0" in response:
                logger.info("✓ SDP negotiation successful")

            # Send ACK
            ack_lines = [
                "ACK sip:agent@localhost:8000 SIP/2.0",
                "Via: SIP/2.0/WSS localhost:8000;branch=z9hG4bKtest456",
                "From: <sip:+15551234567@test.com>;tag=test-tag-12345",
                "To: <sip:agent@localhost:8000>;tag=auto-tag",
                "Call-ID: test-call-id-67890@localhost",
                "CSeq: 1 ACK",
                "Content-Length: 0",
                "",
                "",
            ]
            ack = "\r\n".join(ack_lines)
            logger.info("→ Sending ACK")
            await websocket.send(ack)

            if send_audio:
                logger.info("\n--- Starting audio stream ---")

                # Generate test audio
                test_audio = generate_test_audio_pcmu(duration=3.0, frequency=440.0)

                # Send audio in chunks (simulate RTP packets)
                chunk_size = 160  # 20ms @ 8kHz
                num_chunks = len(test_audio) // chunk_size

                logger.info(f"Sending {num_chunks} audio chunks...")

                for i in range(num_chunks):
                    chunk = test_audio[i * chunk_size : (i + 1) * chunk_size]
                    await websocket.send(chunk)

                    # Simulate 20ms intervals
                    await asyncio.sleep(0.02)

                    # Log progress
                    if (i + 1) % 50 == 0:
                        logger.info(f"  Sent {i + 1}/{num_chunks} chunks")

                    # Try to receive audio back from agent
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=0.001)
                        if isinstance(response, bytes):
                            logger.info(f"← Received audio: {len(response)} bytes")
                    except asyncio.TimeoutError:
                        pass

                logger.info(f"✓ Sent all {num_chunks} audio chunks")

                # Wait a bit for final responses
                logger.info("\nWaiting for agent responses...")
                try:
                    for _ in range(10):
                        response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        if isinstance(response, bytes):
                            logger.info(f"← Received audio response: {len(response)} bytes")
                        else:
                            logger.info(f"← Received text: {response[:100]}...")
                except asyncio.TimeoutError:
                    logger.info("No more responses")

            # Send BYE to end call
            logger.info("\n→ Sending BYE to end call")
            bye_lines = [
                "BYE sip:agent@localhost:8000 SIP/2.0",
                "Via: SIP/2.0/WSS localhost:8000;branch=z9hG4bKtest789",
                "From: <sip:+15551234567@test.com>;tag=test-tag-12345",
                "To: <sip:agent@localhost:8000>;tag=auto-tag",
                "Call-ID: test-call-id-67890@localhost",
                "CSeq: 2 BYE",
                "Content-Length: 0",
                "",
                "",
            ]
            bye = "\r\n".join(bye_lines)
            await websocket.send(bye)

            # Receive 200 OK for BYE
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            logger.info(f"← Received: {response[:50]}...")

            if "200 OK" in response:
                logger.info("✓ Call terminated successfully")

            logger.info("\n" + "=" * 50)
            logger.info("✓ Test completed successfully!")
            logger.info("=" * 50)

    except websockets.exceptions.WebSocketException as e:
        logger.error(f"✗ WebSocket error: {e}")
        sys.exit(1)
    except asyncio.TimeoutError:
        logger.error("✗ Timeout waiting for response")
        sys.exit(1)
    except Exception as e:
        logger.error(f"✗ Error: {e}", exc_info=True)
        sys.exit(1)


async def main():
    """Main test function."""
    import argparse

    parser = argparse.ArgumentParser(description="Test SIP-over-WebSocket endpoint")
    parser.add_argument(
        "--url", default="ws://localhost:8000/sip", help="WebSocket URL (default: ws://localhost:8000/sip)"
    )
    parser.add_argument("--no-audio", action="store_true", help="Skip sending audio data")

    args = parser.parse_args()

    logger.info("=" * 50)
    logger.info("SIP-over-WebSocket Test Client")
    logger.info("=" * 50)
    logger.info(f"Target: {args.url}")
    logger.info(f"Send audio: {not args.no_audio}")
    logger.info("=" * 50 + "\n")

    await test_sip_endpoint(url=args.url, send_audio=not args.no_audio)


if __name__ == "__main__":
    asyncio.run(main())
