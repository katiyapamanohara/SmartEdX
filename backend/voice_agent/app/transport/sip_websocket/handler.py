"""SIP-over-WebSocket handler for telephony integration.

This handler bridges SIP signaling + G.711 audio arriving over a WebSocket
to the Google ADK voice agent, with codec conversion and barge-in support.
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from google.genai.errors import APIError as GenaiAPIError
from websockets.exceptions import ConnectionClosedError

from app.adk.run_config_factory import build_sip_run_config
from app.adk.session_manager import ADKSessionManager
from app.agent import register_call_guard, unregister_call_guard, update_call_guard
from app.audio import AudioCodec, CodecType
from app.config import (
    INSTITUTE_ID,
    END_CALL_INTERRUPT_COOLDOWN,
    HARD_MUTE_SECONDS,
    INTERRUPT_SILENCE_MS,
    MIN_USER_TURNS_BEFORE_END_CALL,
    SILENCE_FLUSH_MS,
    SIP_SERVER_HOST,
    SIP_USE_RTP,
)
from app.latency import latency as latency_tracker
from app.observability.langfuse_client import observe_decorator, update_trace
from app.sip import SIPMessage, SIPRequestBuilder, SIPResponseBuilder, create_rtp_packet, parse_rtp_packet

logger = logging.getLogger(__name__)


class SIPCallSession:
    """Manages a single SIP call session over WebSocket."""

    def __init__(
        self,
        call_id: str,
        from_tag: str,
        to_tag: str,
        codec: AudioCodec,
        websocket: WebSocket,
        mgr: ADKSessionManager,
    ):
        self.call_id = call_id
        self.from_tag = from_tag
        self.to_tag = to_tag
        self.codec = codec
        self.websocket = websocket
        self.mgr = mgr

        self.is_active = False
        self.audio_suppressed = False
        self.last_agent_audio_ts = 0.0
        self.interrupt_active = False
        self.saw_user_input_finished = False
        self.hard_mute_until = 0.0
        self.flushing_silence = False

        self._barge_in_event: asyncio.Event = asyncio.Event()

        # RTP packet tracking
        self.rtp_sequence = 0
        self.rtp_timestamp = 0
        self.rtp_ssrc = 12345

        self.sip_invite: Optional[SIPMessage] = None
        self.end_call_requested = False
        self.user_turn_count = 0
        self.last_interrupt_ts = 0.0
        self.live_request_queue: Optional[LiveRequestQueue] = None

        # Generate-then-speak buffering
        self.audio_buffer: list[bytes] = []
        self.playback_task: Optional[asyncio.Task] = None
        self.playback_active = False
        self.greeting_done = True

    # ── Helpers ──────────────────────────────────────────────────────

    def _mark_agent_audio(self) -> None:
        self.last_agent_audio_ts = time.monotonic()

    def _cancel_playback(self) -> None:
        self.playback_active = False
        self.audio_buffer.clear()
        self._barge_in_event.set()
        if self.playback_task and not self.playback_task.done():
            self.playback_task.cancel()

    def _hard_muted(self) -> bool:
        return time.monotonic() < self.hard_mute_until

    async def _flush_silence(self, duration_ms: int = SILENCE_FLUSH_MS, force: bool = False) -> None:
        if self.flushing_silence and not force:
            return
        self.flushing_silence = True
        try:
            payload_size = 160
            silence_ulaw = bytes([0xFF]) * payload_size
            silence_alaw = bytes([0xD5]) * payload_size
            silence_payload = silence_ulaw if self.codec.codec_type == CodecType.ULAW else silence_alaw
            packets = max(1, int(8000 * (duration_ms / 1000.0)) // payload_size)
            for _ in range(packets):
                if SIP_USE_RTP:
                    payload_type = 0 if self.codec.codec_type == CodecType.ULAW else 8
                    rtp_packet = create_rtp_packet(
                        payload=silence_payload,
                        sequence_number=self.rtp_sequence,
                        timestamp=self.rtp_timestamp,
                        payload_type=payload_type,
                        ssrc=self.rtp_ssrc,
                    )
                    self.rtp_sequence = (self.rtp_sequence + 1) & 0xFFFF
                    self.rtp_timestamp = (self.rtp_timestamp + len(silence_payload)) & 0xFFFFFFFF
                    await self.websocket.send_bytes(rtp_packet)
                else:
                    await self.websocket.send_bytes(silence_payload)
        except Exception as e:
            logger.debug(f"Silence flush failed: {e}")
        finally:
            self.flushing_silence = False

    async def _flush_silence_inline(self) -> None:
        payload_size = 160
        silence_ulaw = bytes([0xFF]) * payload_size
        silence_alaw = bytes([0xD5]) * payload_size
        silence_payload = silence_ulaw if self.codec.codec_type == CodecType.ULAW else silence_alaw
        payload_type = 0 if self.codec.codec_type == CodecType.ULAW else 8
        packets = max(1, int(8000 * (INTERRUPT_SILENCE_MS / 1000.0)) // payload_size)
        try:
            for _ in range(packets):
                if not self.is_active:
                    break
                if SIP_USE_RTP:
                    rtp_packet = create_rtp_packet(
                        payload=silence_payload,
                        sequence_number=self.rtp_sequence,
                        timestamp=self.rtp_timestamp,
                        payload_type=payload_type,
                        ssrc=self.rtp_ssrc,
                    )
                    self.rtp_sequence = (self.rtp_sequence + 1) & 0xFFFF
                    self.rtp_timestamp = (self.rtp_timestamp + len(silence_payload)) & 0xFFFFFFFF
                    await self.websocket.send_bytes(rtp_packet)
                else:
                    await self.websocket.send_bytes(silence_payload)
        except Exception as e:
            logger.debug(f"Call {self.call_id}: inline silence flush error: {e}")

    # ── Playback ─────────────────────────────────────────────────────

    async def _play_buffered_audio(self) -> None:
        if not self.audio_buffer:
            return

        self.playback_active = True
        self._barge_in_event.clear()

        buffer = self.audio_buffer.copy()
        self.audio_buffer.clear()

        chunk_size = 160
        chunk_dur = 0.020
        payload_type = 0 if self.codec.codec_type == CodecType.ULAW else 8

        interrupted = False
        try:
            for sip_audio in buffer:
                if not self.is_active or not self.playback_active:
                    interrupted = True
                    break

                sub_chunks = [sip_audio[i : i + chunk_size] for i in range(0, len(sip_audio), chunk_size)]
                for chunk in sub_chunks:
                    if not self.is_active or not self.playback_active:
                        interrupted = True
                        break

                    if SIP_USE_RTP:
                        rtp_packet = create_rtp_packet(
                            payload=chunk,
                            sequence_number=self.rtp_sequence,
                            timestamp=self.rtp_timestamp,
                            payload_type=payload_type,
                            ssrc=self.rtp_ssrc,
                        )
                        self.rtp_sequence = (self.rtp_sequence + 1) & 0xFFFF
                        self.rtp_timestamp = (self.rtp_timestamp + len(chunk)) & 0xFFFFFFFF
                        await self.websocket.send_bytes(rtp_packet)
                    else:
                        await self.websocket.send_bytes(chunk)

                    self._mark_agent_audio()

                    try:
                        await asyncio.wait_for(self._barge_in_event.wait(), timeout=chunk_dur)
                        interrupted = True
                        break
                    except asyncio.TimeoutError:
                        pass

                if interrupted:
                    break

        except asyncio.CancelledError:
            interrupted = True
        except Exception as e:
            logger.error(f"Call {self.call_id}: playback error: {e}", exc_info=True)
        finally:
            self.playback_active = False

        if not self.greeting_done:
            self.greeting_done = True
            logger.info(f"Call {self.call_id}: greeting complete — user audio forwarding enabled")

        if interrupted and self.is_active:
            await self._flush_silence_inline()

        if self.end_call_requested and self.is_active and not interrupted:
            logger.info(f"Call {self.call_id}: end_call — playback finished, sending BYE")
            await asyncio.sleep(0.5)
            await self._send_bye()
            self.is_active = False

    async def _send_bye(self) -> None:
        if not self.sip_invite:
            return
        try:
            bye_message = SIPRequestBuilder.build_bye(
                invite=self.sip_invite,
                local_tag=self.to_tag,
                server_host=SIP_SERVER_HOST,
            )
            await self.websocket.send_text(bye_message)
            logger.info(f"Call {self.call_id}: sent SIP BYE")
        except Exception as e:
            logger.error(f"Call {self.call_id}: failed to send BYE: {e}", exc_info=True)

    # ── Main session ─────────────────────────────────────────────────

    async def start(self) -> None:
        self.is_active = True
        self.live_request_queue = await self.mgr.initialize()
        register_call_guard(self.mgr.session_id)
        self._t_first_response = latency_tracker.start_timer()
        self._first_response_recorded = False

        run_config = build_sip_run_config()

        try:
            await asyncio.gather(
                self._audio_upstream_task(),
                self._adk_downstream_task(run_config),
            )
        except Exception as e:
            logger.error(f"Error in bidirectional streaming: {e}")
            self.is_active = False

    async def _audio_upstream_task(self) -> None:
        while self.is_active:
            try:
                message = await self.websocket.receive()
                if "bytes" in message:
                    raw_data = message["bytes"]
                    if SIP_USE_RTP:
                        sip_audio, seq, ts = parse_rtp_packet(raw_data)
                    else:
                        sip_audio = raw_data
                    pcm_audio = self.codec.sip_to_pcm16k(sip_audio)
                    audio_blob = types.Blob(mime_type="audio/pcm;rate=16000", data=pcm_audio)
                    if self.live_request_queue and self.greeting_done:
                        self.live_request_queue.send_realtime(audio_blob)
                elif "text" in message:
                    await self._handle_sip_message(message["text"])
            except WebSocketDisconnect:
                self.is_active = False
                break
            except Exception as e:
                logger.error(f"Error in audio upstream: {e}", exc_info=True)
                self.is_active = False
                break

    async def _adk_downstream_task(self, run_config) -> None:
        max_retries = 3
        retry_count = 0

        try:
            while self.is_active and retry_count <= max_retries:
                try:
                    async for event in self.mgr.runner.run_live(
                        user_id=self.mgr.user_id,
                        session_id=self.mgr.session_id,
                        live_request_queue=self.live_request_queue,
                        run_config=run_config,
                    ):
                        if not self.is_active:
                            break

                        event_json = event.model_dump_json(exclude_none=True, by_alias=True)
                        if not self._first_response_recorded:
                            latency_tracker.stop_timer("first_response", self._t_first_response, self.mgr.session_id)
                            self._first_response_recorded = True
                        self.mgr.transcript_handler.process_event(event_json)

                        data = None
                        try:
                            data = json.loads(event_json)
                        except Exception:
                            pass

                        if data:
                            input_tx = data.get("inputTranscription")
                            if input_tx and input_tx.get("text") and self.greeting_done:
                                self.audio_suppressed = True
                                self.interrupt_active = True
                                self.saw_user_input_finished = bool(input_tx.get("finished"))
                                if input_tx.get("finished"):
                                    self.user_turn_count += 1
                                    update_call_guard(self.mgr.session_id, user_turn_count=self.user_turn_count)
                                self.hard_mute_until = time.monotonic() + HARD_MUTE_SECONDS
                                self._cancel_playback()
                            elif input_tx and input_tx.get("text") and not self.greeting_done:
                                logger.debug(f"Call {self.call_id}: ignoring inputTranscription during greeting")
                            elif self.interrupt_active and input_tx and input_tx.get("finished"):
                                self.saw_user_input_finished = True
                                self.user_turn_count += 1
                                update_call_guard(self.mgr.session_id, user_turn_count=self.user_turn_count)

                        event_interrupted = getattr(event, "interrupted", False)
                        if event_interrupted and self.greeting_done:
                            self.audio_suppressed = True
                            self.interrupt_active = True
                            self.saw_user_input_finished = False
                            self.last_interrupt_ts = time.monotonic()
                            self.hard_mute_until = time.monotonic() + HARD_MUTE_SECONDS
                            self._cancel_playback()
                            update_call_guard(self.mgr.session_id, last_interrupt_ts=self.last_interrupt_ts)
                        elif event_interrupted and not self.greeting_done:
                            logger.debug(f"Call {self.call_id}: ignoring interrupted event during greeting")

                        if (
                            hasattr(event, "content")
                            and event.content
                            and hasattr(event.content, "parts")
                            and event.content.parts
                        ):
                            for part in event.content.parts:
                                if hasattr(part, "function_call") and part.function_call:
                                    if part.function_call.name == "end_call":
                                        if self.user_turn_count < MIN_USER_TURNS_BEFORE_END_CALL:
                                            logger.warning(
                                                f"Call {self.call_id}: IGNORING end_call — only "
                                                f"{self.user_turn_count}/{MIN_USER_TURNS_BEFORE_END_CALL} turns"
                                            )
                                            break
                                        since_interrupt = time.monotonic() - self.last_interrupt_ts
                                        if self.last_interrupt_ts > 0 and since_interrupt < END_CALL_INTERRUPT_COOLDOWN:
                                            logger.warning(
                                                f"Call {self.call_id}: IGNORING end_call — "
                                                f"only {since_interrupt:.1f}s since last interrupt "
                                                f"(cooldown {END_CALL_INTERRUPT_COOLDOWN}s)"
                                            )
                                            self.last_interrupt_ts = time.monotonic()
                                            break
                                        self.end_call_requested = True

                            if self._hard_muted():
                                self.audio_suppressed = True
                                self.audio_buffer.clear()
                                continue

                            if self.interrupt_active:
                                if not event_interrupted and not self._hard_muted():
                                    self.audio_suppressed = False
                                    self.interrupt_active = False
                                    self.saw_user_input_finished = False
                                else:
                                    self.audio_suppressed = True
                                    self.audio_buffer.clear()

                            if not self.audio_suppressed:
                                for part in event.content.parts:
                                    if hasattr(part, "inline_data") and part.inline_data:
                                        adk_audio = part.inline_data.data
                                        sip_audio = self.codec.pcm16k_to_sip(adk_audio)
                                        self.audio_buffer.append(sip_audio)

                                turn_complete = getattr(event, "turn_complete", False) or getattr(
                                    event.content, "turn_complete", False
                                )
                                if turn_complete and self.audio_buffer:
                                    if self.playback_task and not self.playback_task.done():
                                        self.playback_task.cancel()
                                    self.playback_task = asyncio.create_task(self._play_buffered_audio())

                            if self.end_call_requested and not self.playback_active and not self.audio_buffer:
                                if not self.playback_task or self.playback_task.done():
                                    await asyncio.sleep(0.5)
                                    await self._send_bye()
                                    self.is_active = False
                                    break

                    break  # Stream ended normally

                except (ConnectionClosedError, GenaiAPIError) as e:
                    retry_count += 1
                    if retry_count <= max_retries and self.is_active and not self.end_call_requested:
                        logger.warning(
                            f"Call {self.call_id}: stream error (attempt {retry_count}/{max_retries}), "
                            f"reconnecting: {e}"
                        )
                        old_queue = self.live_request_queue
                        self.live_request_queue = LiveRequestQueue()
                        if old_queue:
                            old_queue.close()
                        self.audio_suppressed = False
                        self.interrupt_active = False
                        await asyncio.sleep(0.5)
                        continue
                    logger.warning(f"Call {self.call_id}: stream error, ending call: {e}")
                    break

        except asyncio.TimeoutError:
            logger.error("ADK request timed out")
        except Exception as e:
            logger.error(f"Error in ADK downstream: {e}", exc_info=True)
        finally:
            self.is_active = False

    async def _handle_sip_message(self, message: str) -> None:
        try:
            sip_msg = SIPMessage(message)
            if sip_msg.is_request:
                if sip_msg.method == "BYE":
                    response = SIPResponseBuilder.build_response(sip_msg, 200, "OK")
                    await self.websocket.send_text(response)
                    self.is_active = False
        except Exception as e:
            logger.error(f"Error handling SIP message: {e}", exc_info=True)

    async def close(self) -> None:
        self.is_active = False
        self._cancel_playback()
        unregister_call_guard(self.mgr.session_id)
        await self.mgr.finalize()


# ── Endpoint ─────────────────────────────────────────────────────────


def _generate_sdp_answer(codec_type: CodecType) -> str:
    if codec_type == CodecType.ULAW:
        payload_type = 0
        codec_name = "PCMU"
    else:
        payload_type = 8
        codec_name = "PCMA"

    from app.config import SIP_SDP_HOST, SIP_SDP_PORT

    sdp_host = SIP_SDP_HOST
    sdp_port = str(SIP_SDP_PORT)

    sdp = f"""v=0
o=- 0 0 IN IP4 {sdp_host}
s=ADK Voice Agent
c=IN IP4 {sdp_host}
t=0 0
m=audio {sdp_port} RTP/AVP {payload_type}
a=rtpmap:{payload_type} {codec_name}/8000
a=sendrecv
"""
    return sdp


@observe_decorator(name=f"SIP Call - {INSTITUTE_ID}", as_type="generation")
async def sip_websocket_endpoint(
    websocket: WebSocket,
    runner: Runner,
    session_service: InMemorySessionService,
    app_name: str,
    transcript_store: dict,
) -> None:
    """WebSocket endpoint for SIP-over-WebSocket connections."""
    await websocket.accept()

    model_name = runner.agent.model
    call_session: Optional[SIPCallSession] = None

    try:
        invite_msg = await websocket.receive_text()
        sip_invite = SIPMessage(invite_msg)

        if not sip_invite.is_request or sip_invite.method != "INVITE":
            await websocket.close(code=1002, reason="Expected INVITE")
            return

        call_id = sip_invite.get_call_id()
        from_tag = sip_invite.get_from_tag()
        if not call_id or not from_tag:
            await websocket.close(code=1002, reason="Invalid INVITE")
            return

        # Langfuse trace
        update_trace(
            tags=["voice-agent", "sip-websocket", model_name, f"agent:{INSTITUTE_ID}"],
            metadata={
                "model": model_name,
                "call_id": call_id,
                "sip_uri": sip_invite.uri,
                "from_tag": from_tag,
            },
        )

        sdp = sip_invite.get_sdp()
        codec_type = AudioCodec.get_codec_from_sdp(sdp) if sdp else CodecType.ULAW
        codec = AudioCodec(codec_type)

        # SIP signaling: 100 Trying → 200 OK
        trying_response = SIPResponseBuilder.build_response(sip_invite, 100, "Trying")
        await websocket.send_text(trying_response)

        to_tag = str(uuid.uuid4())[:10]
        sdp_answer = _generate_sdp_answer(codec_type)

        ok_response = SIPResponseBuilder.build_response(
            sip_invite,
            200,
            "OK",
            body=sdp_answer,
            extra_headers={
                "Content-Type": "application/sdp",
                "Contact": f"<sip:agent@{SIP_SERVER_HOST}>",
                "To": f"{sip_invite.get_header('To')};tag={to_tag}",
            },
        )
        await websocket.send_text(ok_response)

        # Build shared session manager
        mgr = ADKSessionManager(
            runner=runner,
            session_service=session_service,
            transcript_store=transcript_store,
            user_id=f"sip-{from_tag}",
            session_id=call_id,
            institute_id=INSTITUTE_ID,
            is_sip=True,
            call_id=call_id,
        )

        call_session = SIPCallSession(
            call_id=call_id,
            from_tag=from_tag,
            to_tag=to_tag,
            codec=codec,
            websocket=websocket,
            mgr=mgr,
        )
        call_session.sip_invite = sip_invite

        await call_session.start()

    except WebSocketDisconnect:
        logger.info("SIP WebSocket disconnected")
    except Exception as e:
        logger.error(f"Error in SIP handler: {e}", exc_info=True)
    finally:
        if call_session:
            await call_session.close()
