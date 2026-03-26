"""Native SIP/UDP server for telephony integration with SIP.

This module provides a standard SIP server (UDP on port 5060) and RTP audio
handling for direct integration with SIP trunk providers.
"""

import asyncio
import json
import logging
import re
import socket
import time
import uuid
from typing import Dict, Optional, Tuple

import audioop
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from google.genai.errors import APIError as GenaiAPIError

from app.adk.run_config_factory import build_sip_run_config
from app.agent import register_call_guard, unregister_call_guard, update_call_guard
from app.agent.api import end_assistant_session, start_assistant_session
from app.agent.audio_clips import (
    register_session_audio_queue,
    unregister_session_audio_queue,
)
from app.audio import AudioCodec, CodecType
from app.config import (
    AUDIO_CLIP_TOOL_MAP,
    END_CALL_INTERRUPT_COOLDOWN,
    HARD_MUTE_SECONDS,
    INTERRUPT_TIMEOUT_SECONDS,
    MIN_USER_TURNS_BEFORE_END_CALL,
    SILENCE_FLUSH_MS,
    SIP_AUDIO_GAIN,
    SIP_BIND_ADDRESS,
    SIP_PORT,
    SIP_SDP_PORT,
    SIP_SERVER_HOST,
)
from app.latency import latency as latency_tracker
from app.observability.langfuse_client import get_langfuse
from app.sip import SIPMessage, SIPRequestBuilder, SIPResponseBuilder, create_rtp_packet, parse_rtp_packet
from app.transcription import TranscriptHandler
from app.transport.sip_udp.call_session import SIPCallInfo

logger = logging.getLogger(__name__)


class SIPUDPProtocol(asyncio.DatagramProtocol):
    """UDP protocol handler for SIP signaling."""

    def __init__(self, sip_server: "NativeSIPServer"):
        self.sip_server = sip_server
        self.transport: Optional[asyncio.DatagramTransport] = None

    def connection_made(self, transport: asyncio.DatagramTransport) -> None:
        self.transport = transport
        logger.info("SIP UDP server started")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]) -> None:
        try:
            message = data.decode("utf-8")
            asyncio.create_task(self.sip_server.handle_sip_message(message, addr, self.transport))
        except UnicodeDecodeError:
            logger.warning(f"Non-UTF8 data received on SIP port from {addr}")
        except Exception as e:
            logger.error(f"Error handling SIP datagram: {e}", exc_info=True)

    def error_received(self, exc: Exception) -> None:
        logger.error(f"SIP UDP error: {exc}")

    def connection_lost(self, exc: Optional[Exception]) -> None:
        logger.warning(f"SIP UDP connection lost: {exc}")


class RTPUDPProtocol(asyncio.DatagramProtocol):
    """UDP protocol handler for RTP audio."""

    def __init__(self, sip_server: "NativeSIPServer"):
        self.sip_server = sip_server
        self.transport: Optional[asyncio.DatagramTransport] = None

    def connection_made(self, transport: asyncio.DatagramTransport) -> None:
        self.transport = transport
        logger.info("RTP UDP server started")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]) -> None:
        try:
            asyncio.create_task(self.sip_server.handle_rtp_packet(data, addr))
        except Exception as e:
            logger.error(f"Error handling RTP datagram: {e}", exc_info=True)

    def error_received(self, exc: Exception) -> None:
        logger.error(f"RTP UDP error: {exc}")

    def connection_lost(self, exc: Optional[Exception]) -> None:
        logger.warning(f"RTP UDP connection lost: {exc}")


class NativeSIPServer:
    """Native SIP/UDP server for telco integration."""

    def __init__(
        self,
        runner: Runner,
        session_service: InMemorySessionService,
        app_name: str,
        institute_id: str = "",
        greeting_message: str = "Hello! How can I help you today?",
        sip_port: int = 5060,
        rtp_port: int = 20000,
        bind_address: str = "0.0.0.0",
    ):
        self.runner = runner
        self.session_service = session_service
        self.app_name = app_name
        self.institute_id = institute_id
        self.greeting_message = greeting_message
        self.sip_port = sip_port
        self.rtp_port = rtp_port
        self.bind_address = bind_address

        self.calls: Dict[str, SIPCallInfo] = {}
        self.rtp_addr_to_call: Dict[Tuple[str, int], str] = {}

        self.sip_transport: Optional[asyncio.DatagramTransport] = None
        self.rtp_transport: Optional[asyncio.DatagramTransport] = None

        self.transcript_store: Dict[str, list] = {}
        self._running = False

    # ── Helpers ──────────────────────────────────────────────────────

    def _mark_agent_audio(self, call_info: SIPCallInfo) -> None:
        call_info.last_agent_audio_ts = time.monotonic()

    def _hard_muted(self, call_info: SIPCallInfo) -> bool:
        return time.monotonic() < call_info.hard_mute_until

    async def _flush_silence(self, call_info: SIPCallInfo) -> None:
        if call_info.flushing_silence:
            return
        call_info.flushing_silence = True
        try:
            if not call_info.remote_rtp_addr or not self.rtp_transport:
                return

            drained = 0
            while not call_info.rtp_output_queue.empty():
                try:
                    call_info.rtp_output_queue.get_nowait()
                    drained += 1
                except asyncio.QueueEmpty:
                    break
            if drained:
                logger.debug(f"Call {call_info.call_id}: drained {drained} RTP chunks before silence flush")

            payload_size = 160
            silence_payload = (
                bytes([0xFF]) * payload_size
                if call_info.codec.codec_type == CodecType.ULAW
                else bytes([0xD5]) * payload_size
            )
            total_samples = int(8000 * (SILENCE_FLUSH_MS / 1000.0))
            packets = max(1, total_samples // payload_size)
            payload_type = 0 if call_info.codec.codec_type == CodecType.ULAW else 8
            for _ in range(packets):
                rtp_packet = create_rtp_packet(
                    payload=silence_payload,
                    sequence_number=call_info.rtp_sequence,
                    timestamp=call_info.rtp_timestamp,
                    payload_type=payload_type,
                    ssrc=call_info.rtp_ssrc,
                )
                call_info.rtp_sequence = (call_info.rtp_sequence + 1) & 0xFFFF
                call_info.rtp_timestamp = (call_info.rtp_timestamp + len(silence_payload)) & 0xFFFFFFFF
                self.rtp_transport.sendto(rtp_packet, call_info.remote_rtp_addr)
        except Exception as e:
            logger.debug(f"Silence flush failed: {e}")
        finally:
            call_info.flushing_silence = False

    # ── Server lifecycle ─────────────────────────────────────────────

    async def start(self) -> None:
        if self._running:
            return
        loop = asyncio.get_event_loop()

        sip_transport, _ = await loop.create_datagram_endpoint(
            lambda: SIPUDPProtocol(self),
            local_addr=(self.bind_address, self.sip_port),
        )
        self.sip_transport = sip_transport
        logger.info(f"SIP server listening on {self.bind_address}:{self.sip_port}")

        rtp_transport, _ = await loop.create_datagram_endpoint(
            lambda: RTPUDPProtocol(self),
            local_addr=(self.bind_address, self.rtp_port),
        )
        self.rtp_transport = rtp_transport
        logger.info(f"RTP server listening on {self.bind_address}:{self.rtp_port}")

        self._running = True

    async def stop(self) -> None:
        self._running = False
        for call_id in list(self.calls.keys()):
            await self._terminate_call(call_id)
        if self.sip_transport:
            self.sip_transport.close()
            self.sip_transport = None
        if self.rtp_transport:
            self.rtp_transport.close()
            self.rtp_transport = None
        logger.info("SIP server stopped")

    # ── SIP message handling ─────────────────────────────────────────

    async def handle_sip_message(
        self, message: str, addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        try:
            sip_msg = SIPMessage(message)
            if sip_msg.is_request:
                await self._handle_request(sip_msg, addr, transport)
            else:
                await self._handle_response(sip_msg, addr)
        except Exception as e:
            logger.error(f"Error handling SIP message: {e}", exc_info=True)

    async def _handle_request(
        self, sip_msg: SIPMessage, addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        method = sip_msg.method
        if method == "INVITE":
            await self._handle_invite(sip_msg, addr, transport)
        elif method == "ACK":
            await self._handle_ack(sip_msg, addr)
        elif method == "BYE":
            await self._handle_bye(sip_msg, addr, transport)
        elif method == "CANCEL":
            await self._handle_cancel(sip_msg, addr, transport)
        elif method == "OPTIONS":
            await self._handle_options(sip_msg, addr, transport)
        elif method == "REGISTER":
            await self._handle_register(sip_msg, addr, transport)
        else:
            response = SIPResponseBuilder.build_response(sip_msg, 501, "Not Implemented", remote_addr=addr)
            self._send_sip_response(response, sip_msg, addr, transport)

    def _send_sip_response(
        self, response: str, request: SIPMessage, source_addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        dest = SIPResponseBuilder.get_response_destination(request, source_addr)
        transport.sendto(response.encode("utf-8"), dest)

    async def _handle_invite(
        self, sip_msg: SIPMessage, addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        call_id = sip_msg.get_call_id()
        from_tag = sip_msg.get_from_tag()

        if not call_id or not from_tag:
            response = SIPResponseBuilder.build_response(sip_msg, 400, "Bad Request", remote_addr=addr)
            self._send_sip_response(response, sip_msg, addr, transport)
            return

        logger.info(f"Incoming call: {call_id} from {addr}")

        trying = SIPResponseBuilder.build_response(sip_msg, 100, "Trying", remote_addr=addr)
        self._send_sip_response(trying, sip_msg, addr, transport)

        sdp = sip_msg.get_sdp()
        codec_type = AudioCodec.get_codec_from_sdp(sdp) if sdp else CodecType.ULAW
        remote_rtp_addr = self._parse_rtp_address_from_sdp(sdp) if sdp else None

        to_tag = str(uuid.uuid4())[:10]

        call_info = SIPCallInfo(
            call_id=call_id,
            from_tag=from_tag,
            to_tag=to_tag,
            remote_addr=addr,
            remote_rtp_addr=remote_rtp_addr,
            codec=AudioCodec(codec_type),
            user_id=f"sip-{from_tag}",
            session_id=call_id,
        )

        self.calls[call_id] = call_info

        if remote_rtp_addr:
            self.rtp_addr_to_call[remote_rtp_addr] = call_id
            logger.info(f"Call {call_id}: Remote RTP at {remote_rtp_addr}, codec {codec_type}")

        from app.config import GOOGLE_API_KEY, GOOGLE_APPLICATION_CREDENTIALS

        if not GOOGLE_API_KEY and not GOOGLE_APPLICATION_CREDENTIALS:
            response = SIPResponseBuilder.build_response(sip_msg, 503, "Service Unavailable", remote_addr=addr)
            self._send_sip_response(response, sip_msg, addr, transport)
            self.calls.pop(call_id, None)
            return

        sdp_answer = self._generate_sdp_answer(codec_type)

        ok_response = SIPResponseBuilder.build_response(
            sip_msg,
            200,
            "OK",
            body=sdp_answer,
            extra_headers={
                "Content-Type": "application/sdp",
                "Contact": f"<sip:agent@{SIP_SERVER_HOST}:{self.sip_port}>",
            },
            remote_addr=addr,
            to_tag=to_tag,
        )
        self._send_sip_response(ok_response, sip_msg, addr, transport)
        logger.info(f"Sent 200 OK for call: {call_id}")

        call_info._invite_request = sip_msg
        call_info._sip_transport = transport

    async def _handle_ack(self, sip_msg: SIPMessage, addr: Tuple[str, int]) -> None:
        call_id = sip_msg.get_call_id()
        call_info = self.calls.get(call_id)
        if call_info is None:
            return
        logger.info(f"Call established: {call_id}")
        await self._start_adk_session(call_info)

    async def _handle_bye(
        self, sip_msg: SIPMessage, addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        call_id = sip_msg.get_call_id()
        response = SIPResponseBuilder.build_response(sip_msg, 200, "OK", remote_addr=addr)
        self._send_sip_response(response, sip_msg, addr, transport)
        logger.info(f"Call terminated by remote: {call_id}")
        await self._terminate_call(call_id)

    async def _handle_cancel(
        self, sip_msg: SIPMessage, addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        call_id = sip_msg.get_call_id()
        response = SIPResponseBuilder.build_response(sip_msg, 200, "OK", remote_addr=addr)
        self._send_sip_response(response, sip_msg, addr, transport)
        await self._terminate_call(call_id)

    async def _handle_options(
        self, sip_msg: SIPMessage, addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        response = SIPResponseBuilder.build_response(
            sip_msg,
            200,
            "OK",
            extra_headers={
                "Contact": f"<sip:agent@{SIP_SERVER_HOST}:{self.sip_port}>",
                "Accept": "application/sdp",
                "Allow": "INVITE, ACK, BYE, CANCEL, OPTIONS, REGISTER",
                "Supported": "replaces, timer",
                "Server": "Articom-Voice-Agent/1.0",
            },
            remote_addr=addr,
        )
        self._send_sip_response(response, sip_msg, addr, transport)

    async def _handle_register(
        self, sip_msg: SIPMessage, addr: Tuple[str, int], transport: asyncio.DatagramTransport
    ) -> None:
        contact = sip_msg.get_header("Contact") or f"<sip:agent@{SIP_SERVER_HOST}>"
        expires = sip_msg.get_header("Expires") or "3600"
        response = SIPResponseBuilder.build_response(
            sip_msg,
            200,
            "OK",
            extra_headers={
                "Contact": contact,
                "Expires": expires,
                "Server": "Articom-Voice-Agent/1.0",
            },
            remote_addr=addr,
        )
        self._send_sip_response(response, sip_msg, addr, transport)

    async def _handle_response(self, sip_msg: SIPMessage, addr: Tuple[str, int]) -> None:
        logger.debug(f"SIP response from {addr}: {sip_msg.status_code} {sip_msg.reason}")

    # ── RTP handling ─────────────────────────────────────────────────

    async def handle_rtp_packet(self, data: bytes, addr: Tuple[str, int]) -> None:
        call_id = self.rtp_addr_to_call.get(addr)

        if not call_id:
            for rtp_addr, cid in self.rtp_addr_to_call.items():
                if rtp_addr[0] == addr[0]:
                    call_id = cid
                    self.rtp_addr_to_call[addr] = call_id
                    break

        if not call_id:
            return

        call_info = self.calls.get(call_id)
        if call_info is None:
            return

        if not call_info.is_active or not call_info.live_request_queue:
            return

        try:
            audio_payload, seq, ts = parse_rtp_packet(data)
            pcm_audio = call_info.codec.sip_to_pcm16k(audio_payload)

            call_info.rtp_frame_count += 1
            if call_info.rtp_frame_count % 50 == 1:
                _peak = (
                    max(
                        abs(int.from_bytes(pcm_audio[i : i + 2], "little", signed=True))
                        for i in range(0, len(pcm_audio), 2)
                    )
                    if pcm_audio
                    else 0
                )
                logger.debug(
                    f"Call {call_info.call_id} AUDIO_DEBUG: "
                    f"frame={call_info.rtp_frame_count} peak={_peak} "
                    f"agent_playing={call_info.playback_active or not call_info.rtp_output_queue.empty()} "
                    f"audio_suppressed={call_info.audio_suppressed} "
                    f"interrupt_active={call_info.interrupt_active} "
                    f"hard_muted={self._hard_muted(call_info)}"
                )

                if (
                    call_info.interrupt_active
                    and call_info.interrupt_active_since > 0
                    and (time.monotonic() - call_info.interrupt_active_since) > INTERRUPT_TIMEOUT_SECONDS
                ):
                    logger.warning(
                        f"Call {call_info.call_id}: interrupt_active stuck for "
                        f">{INTERRUPT_TIMEOUT_SECONDS}s — forcing recovery"
                    )
                    call_info.audio_suppressed = False
                    call_info.interrupt_active = False
                    call_info.interrupt_active_since = 0.0
                    call_info.saw_user_input_finished = False

            if pcm_audio and call_info.is_active:
                if not call_info.greeting_done:
                    pass
                else:
                    if SIP_AUDIO_GAIN != 1.0:
                        pcm_audio = audioop.mul(pcm_audio, 2, SIP_AUDIO_GAIN)
                    audio_blob = types.Blob(mime_type="audio/pcm;rate=16000", data=pcm_audio)
                    call_info.live_request_queue.send_realtime(audio_blob)

        except Exception as e:
            logger.error(f"Error processing RTP packet: {e}", exc_info=True)

    # ── ADK session ──────────────────────────────────────────────────

    async def _start_adk_session(self, call_info: SIPCallInfo) -> None:
        t_setup = latency_tracker.start_timer()
        try:
            await self.session_service.create_session(
                app_name=self.app_name,
                user_id=call_info.user_id,
                session_id=call_info.session_id,
            )

            call_info.live_request_queue = LiveRequestQueue()
            call_info.is_active = True
            register_call_guard(call_info.session_id)

            try:
                langfuse = get_langfuse()
            except Exception:
                langfuse = None
            call_info.transcript_handler = TranscriptHandler(call_info.session_id, self.transcript_store, langfuse)
            try:
                core_resp = start_assistant_session(
                    session_id=call_info.session_id,
                    user_id=call_info.user_id,
                    institute_id=self.institute_id,
                    is_sip=True,
                    call_id=call_info.call_id,
                )
                call_info.core_session_id = core_resp.get("session_id") or core_resp.get("id")
                logger.info(f"Started SmartEdX Core session for call {call_info.call_id}: {call_info.core_session_id}")
            except Exception as e:
                logger.warning(f"Failed to start SmartEdX Core session for call {call_info.call_id}: {e}")

            logger.info(f"Sending greeting for call {call_info.call_id}: {self.greeting_message}")
            greeting_prompt = f"Say exactly this greeting to the user (do not add anything else): {self.greeting_message}"
            greeting_content = types.Content(parts=[types.Part(text=greeting_prompt)], role="user")
            call_info.live_request_queue.send_content(greeting_content)
            call_info.transcript_handler.record_greeting(self.greeting_message)

            call_info.adk_task = asyncio.create_task(self._run_adk_session(call_info))
            call_info.rtp_pacing_task = asyncio.create_task(self._rtp_pacing_worker(call_info))

            if AUDIO_CLIP_TOOL_MAP:
                register_session_audio_queue(call_info.session_id)
                call_info.audio_inject_task = asyncio.create_task(self._audio_clip_injection_worker(call_info))

            latency_tracker.stop_timer("session_init", t_setup, call_info.session_id)
            logger.info(f"ADK session started for call: {call_info.call_id}")
        except Exception as e:
            logger.error(f"Failed to start ADK session: {e}", exc_info=True)
            await self._terminate_call(call_info.call_id)

    async def _run_adk_session(self, call_info: SIPCallInfo) -> None:
        run_config = build_sip_run_config()
        t_first_response = latency_tracker.start_timer()
        first_response_recorded = False
        greeting_turn_audio_seen = False
        max_retries = 3
        retry_count = 0

        try:
            while call_info.is_active and retry_count <= max_retries:
                try:
                    async for event in self.runner.run_live(
                        user_id=call_info.user_id,
                        session_id=call_info.session_id,
                        live_request_queue=call_info.live_request_queue,
                        run_config=run_config,
                    ):
                        if not call_info.is_active:
                            break

                        if not first_response_recorded:
                            latency_tracker.stop_timer("first_response", t_first_response, call_info.session_id)
                            first_response_recorded = True

                        event_json = event.model_dump_json(exclude_none=True, by_alias=True)

                        event_interrupted = getattr(event, "interrupted", False)
                        if event_interrupted and call_info.greeting_done:
                            if not call_info.audio_suppressed:
                                call_info.audio_suppressed = True
                                call_info.interrupt_active = True
                                call_info.interrupt_active_since = time.monotonic()
                                call_info.last_interrupt_ts = time.monotonic()
                                call_info.hard_mute_until = time.monotonic() + HARD_MUTE_SECONDS
                                update_call_guard(call_info.session_id, last_interrupt_ts=call_info.last_interrupt_ts)
                            asyncio.create_task(self._flush_silence(call_info))
                            logger.info(f"Call {call_info.call_id}: ADK interrupted — audio suppressed")
                        elif event_interrupted and not call_info.greeting_done:
                            logger.debug(f"Call {call_info.call_id}: ignoring interrupted event during greeting")

                        if call_info.transcript_handler:
                            call_info.transcript_handler.process_event(event_json)

                        if (
                            hasattr(event, "content")
                            and event.content
                            and hasattr(event.content, "parts")
                            and event.content.parts
                        ):
                            for part in event.content.parts:
                                if hasattr(part, "function_call") and part.function_call:
                                    if AUDIO_CLIP_TOOL_MAP and part.function_call.name in AUDIO_CLIP_TOOL_MAP:
                                        call_info.clip_audio_suppressed = True
                                        logger.debug(
                                            f"Call {call_info.call_id}: audio clip tool call — suppressing model audio"
                                        )
                                    if part.function_call.name == "end_call":
                                        if call_info.user_turn_count < MIN_USER_TURNS_BEFORE_END_CALL:
                                            logger.warning(
                                                f"Call {call_info.call_id}: IGNORING end_call — only "
                                                f"{call_info.user_turn_count}/{MIN_USER_TURNS_BEFORE_END_CALL} turns"
                                            )
                                            break
                                        since_interrupt = time.monotonic() - call_info.last_interrupt_ts
                                        if (
                                            call_info.last_interrupt_ts > 0
                                            and since_interrupt < END_CALL_INTERRUPT_COOLDOWN
                                        ):
                                            logger.warning(
                                                f"Call {call_info.call_id}: IGNORING end_call — "
                                                f"only {since_interrupt:.1f}s since last interrupt "
                                                f"(cooldown {END_CALL_INTERRUPT_COOLDOWN}s)"
                                            )
                                            call_info.last_interrupt_ts = time.monotonic()
                                            break
                                        call_info.end_call_requested = True
                                        call_info.end_call_requested_at = time.monotonic()
                                        call_info.audio_suppressed = False
                                        call_info.interrupt_active = False
                                        logger.info(f"Call {call_info.call_id}: agent invoked end_call")

                            if self._hard_muted(call_info):
                                call_info.audio_suppressed = True
                                continue

                            if call_info.interrupt_active:
                                if not event_interrupted and not self._hard_muted(call_info):
                                    call_info.audio_suppressed = False
                                    call_info.interrupt_active = False
                                    call_info.interrupt_active_since = 0.0
                                    call_info.saw_user_input_finished = False
                                    logger.info(f"Call {call_info.call_id}: audio suppression lifted")
                                else:
                                    call_info.audio_suppressed = True

                            if not call_info.audio_suppressed and not call_info.clip_audio_suppressed:
                                for part in event.content.parts:
                                    if hasattr(part, "inline_data") and part.inline_data:
                                        greeting_turn_audio_seen = True
                                        mime = getattr(part.inline_data, "mime_type", "") or ""
                                        rate = AudioCodec.parse_sample_rate(mime, default=24000)
                                        await self._send_audio_to_sip(call_info, part.inline_data.data, input_rate=rate)

                        try:
                            _evt_data = json.loads(event_json)
                        except Exception:
                            _evt_data = None

                        if _evt_data:
                            if _evt_data.get("usageMetadata") and call_info.clip_audio_suppressed:
                                call_info.clip_audio_suppressed = False
                                logger.debug(f"Call {call_info.call_id}: turn complete — clip audio suppression lifted")
                            if (
                                not call_info.greeting_audio_queued
                                and greeting_turn_audio_seen
                                and _evt_data.get("usageMetadata")
                            ):
                                call_info.greeting_audio_queued = True
                                logger.info(
                                    f"Call {call_info.call_id}: greeting audio queued — waiting for RTP playback to finish"
                                )

                            _input_tx = _evt_data.get("inputTranscription")
                            _output_tx = _evt_data.get("outputTranscription")

                            if _input_tx and _input_tx.get("text"):
                                logger.info(
                                    f"Call {call_info.call_id}: inputTranscription "
                                    f"text={_input_tx['text']!r} finished={_input_tx.get('finished')}"
                                )
                                call_info.saw_user_input_finished = bool(_input_tx.get("finished"))
                                if _input_tx.get("finished"):
                                    call_info.user_turn_count += 1
                                    update_call_guard(call_info.session_id, user_turn_count=call_info.user_turn_count)
                            elif call_info.interrupt_active and _input_tx and _input_tx.get("finished"):
                                call_info.saw_user_input_finished = True
                                call_info.user_turn_count += 1
                                update_call_guard(call_info.session_id, user_turn_count=call_info.user_turn_count)

                            if not call_info.end_call_requested:
                                _content = _evt_data.get("content", {})
                                for _part in _content.get("parts") or []:
                                    _fc = _part.get("functionCall") or _part.get("function_call")
                                    if _fc and _fc.get("name") == "end_call":
                                        if call_info.user_turn_count < MIN_USER_TURNS_BEFORE_END_CALL:
                                            break
                                        _since = time.monotonic() - call_info.last_interrupt_ts
                                        if call_info.last_interrupt_ts > 0 and _since < END_CALL_INTERRUPT_COOLDOWN:
                                            call_info.last_interrupt_ts = time.monotonic()
                                            break
                                        call_info.end_call_requested = True
                                        call_info.end_call_requested_at = time.monotonic()
                                        call_info.audio_suppressed = False
                                        call_info.interrupt_active = False
                                        break

                    break  # Stream ended normally

                except GenaiAPIError as e:
                    retry_count += 1
                    if retry_count <= max_retries and call_info.is_active and not call_info.end_call_requested:
                        logger.warning(
                            f"Call {call_info.call_id}: GenAI stream error "
                            f"(attempt {retry_count}/{max_retries}), reconnecting: {e}"
                        )
                        old_queue = call_info.live_request_queue
                        call_info.live_request_queue = LiveRequestQueue()
                        if old_queue:
                            old_queue.close()
                        call_info.audio_suppressed = False
                        call_info.interrupt_active = False
                        call_info.interrupt_active_since = 0.0
                        await asyncio.sleep(0.5)
                        continue
                    logger.info(f"ADK session closed for call {call_info.call_id}: {e}")
                    if not call_info.end_call_requested:
                        call_info.end_call_requested = True
                        call_info.end_call_requested_at = time.monotonic()
                    break

        except asyncio.CancelledError:
            logger.info(f"ADK session cancelled for call: {call_info.call_id}")
        except TypeError as e:
            logger.debug(f"ADK session teardown (TypeError): {e}")
        except Exception as e:
            logger.error(f"ADK session error: {e}", exc_info=True)
        finally:
            if call_info.call_id in self.calls:
                if not call_info.end_call_requested:
                    call_info.end_call_requested = True
                    call_info.end_call_requested_at = time.monotonic()
                try:
                    if call_info.rtp_pacing_task and not call_info.rtp_pacing_task.done():
                        await asyncio.wait_for(call_info.rtp_pacing_task, timeout=10.0)
                except (asyncio.TimeoutError, asyncio.CancelledError):
                    await self._send_bye(call_info)
                call_info.adk_task = None
                await self._terminate_call(call_info.call_id)

    async def _send_audio_to_sip(self, call_info: SIPCallInfo, pcm_audio: bytes, input_rate: int = 24000) -> None:
        if not call_info.remote_rtp_addr or not self.rtp_transport:
            return
        if call_info.audio_suppressed:
            return
        try:
            sip_audio = call_info.codec.pcm16k_to_sip(pcm_audio, input_rate=input_rate)
            chunk_size = 160
            for i in range(0, len(sip_audio), chunk_size):
                if call_info.audio_suppressed:
                    break
                chunk = sip_audio[i : i + chunk_size]
                await call_info.rtp_output_queue.put(chunk)
        except Exception as e:
            logger.error(f"Error preparing RTP audio: {e}", exc_info=True)

    async def _rtp_pacing_worker(self, call_info: SIPCallInfo) -> None:
        payload_type = 0 if call_info.codec.codec_type == CodecType.ULAW else 8
        TICK = 0.020
        END_CALL_GRACE_SECONDS = 3.0

        while call_info.is_active:
            try:
                try:
                    chunk = await asyncio.wait_for(call_info.rtp_output_queue.get(), timeout=0.1)
                except asyncio.TimeoutError:
                    call_info.playback_active = False
                    if call_info.greeting_audio_queued and not call_info.greeting_done:
                        call_info.greeting_done = True
                        logger.info(f"Call {call_info.call_id}: greeting complete — user audio forwarding enabled")
                    if call_info.end_call_requested and call_info.is_active:
                        elapsed = time.monotonic() - call_info.end_call_requested_at
                        if elapsed < END_CALL_GRACE_SECONDS:
                            continue
                        logger.info(f"Call {call_info.call_id}: end_call — playback finished, sending BYE")
                        await asyncio.sleep(0.5)
                        await self._send_bye(call_info)
                        call_info.is_active = False
                        break
                    continue

                if call_info.audio_suppressed:
                    discarded = 1
                    while not call_info.rtp_output_queue.empty():
                        try:
                            call_info.rtp_output_queue.get_nowait()
                            discarded += 1
                        except asyncio.QueueEmpty:
                            break
                    call_info.playback_active = False
                    continue

                call_info.playback_active = True

                rtp_packet = create_rtp_packet(
                    payload=chunk,
                    sequence_number=call_info.rtp_sequence,
                    timestamp=call_info.rtp_timestamp,
                    payload_type=payload_type,
                    ssrc=call_info.rtp_ssrc,
                )
                call_info.rtp_sequence = (call_info.rtp_sequence + 1) & 0xFFFF
                call_info.rtp_timestamp = (call_info.rtp_timestamp + len(chunk)) & 0xFFFFFFFF
                self.rtp_transport.sendto(rtp_packet, call_info.remote_rtp_addr)
                self._mark_agent_audio(call_info)

                await asyncio.sleep(TICK)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"RTP pacing worker error: {e}", exc_info=True)

        call_info.playback_active = False

    # ── Audio clip injection (SIP) ────────────────────────────────────

    async def _audio_clip_injection_worker(self, call_info: SIPCallInfo) -> None:
        """Drains the audio clip queue and forwards clips to the RTP output."""
        from app.agent.audio_clips import _registry, _registry_lock

        with _registry_lock:
            entry = _registry.get(call_info.session_id)
        if entry is None:
            return
        q, _ = entry

        while call_info.is_active:
            try:
                pcm_bytes = await asyncio.wait_for(q.get(), timeout=0.5)
                logger.info(f"Call {call_info.call_id}: injecting audio clip ({len(pcm_bytes)} bytes)")
                await self._send_audio_to_sip(call_info, pcm_bytes, input_rate=24000)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Call {call_info.call_id}: audio clip injection error: {e}")

    # ── BYE and teardown ─────────────────────────────────────────────

    def _get_bye_destination(self, call_info: SIPCallInfo) -> Tuple[str, int]:
        invite = getattr(call_info, "_invite_request", None)
        if invite:
            record_routes = invite.get_all_headers("Record-Route")
            if record_routes:
                first_route = list(reversed(record_routes))[0]
                uri_match = re.search(r"sip:([^;>\s:]+)(?::(\d+))?", first_route)
                if uri_match:
                    host = uri_match.group(1)
                    port = int(uri_match.group(2)) if uri_match.group(2) else 5060
                    return (host, port)
        return call_info.remote_addr

    async def _send_bye(self, call_info: SIPCallInfo) -> None:
        if call_info.bye_sent:
            return
        call_info.bye_sent = True

        invite = getattr(call_info, "_invite_request", None)
        if not invite:
            return

        transport = getattr(call_info, "_sip_transport", None)
        if not transport:
            return

        try:
            bye_message = SIPRequestBuilder.build_bye(
                invite=invite,
                local_tag=call_info.to_tag,
                server_host=SIP_SERVER_HOST,
            )
            bye_bytes = bye_message.encode("utf-8")
            dest = self._get_bye_destination(call_info)
            transport.sendto(bye_bytes, dest)
            logger.info(f"Call {call_info.call_id}: sent SIP BYE to {dest}")

            async def _retransmit() -> None:
                for delay in (0.5, 1.0):
                    await asyncio.sleep(delay)
                    if call_info.call_id not in self.calls:
                        return
                    try:
                        transport.sendto(bye_bytes, dest)
                    except Exception:
                        return

            asyncio.create_task(_retransmit())
        except Exception as e:
            logger.error(f"Call {call_info.call_id}: failed to send BYE: {e}", exc_info=True)

    async def _terminate_call(self, call_id: str) -> None:
        # Atomically pop from tracking dicts to prevent double cleanup
        call_info = self.calls.pop(call_id, None)
        if call_info is None:
            return

        if call_info.remote_rtp_addr:
            self.rtp_addr_to_call.pop(call_info.remote_rtp_addr, None)

        call_info.is_active = False
        unregister_call_guard(call_info.session_id)

        if call_info.live_request_queue:
            call_info.live_request_queue.close()

        if call_info.transcript_handler:
            call_info.transcript_handler.finalize()
            call_info.transcript_handler.log_transcript(f"SIP CALL TRANSCRIPT - Call ID: {call_id}")

            try:
                accumulated_usage = call_info.transcript_handler.get_accumulated_usage()
                from app.observability.langfuse_client import update_generation

                if any(v > 0 for v in accumulated_usage.values()):
                    conversation_context = call_info.transcript_handler.get_conversation_context()
                    update_generation(
                        input=conversation_context["input"],
                        output=conversation_context["output"],
                        model=self.runner.agent.model,
                        usage_details=accumulated_usage,
                    )
            except Exception as e:
                logger.debug(f"Langfuse usage reporting skipped: {e}")

            if call_info.core_session_id:
                try:
                    final_transcript = call_info.transcript_handler.get_transcript()
                    end_assistant_session(
                        session_id=call_info.core_session_id,
                        history=final_transcript,
                    )
                    logger.info(f"Ended Articom Core session for call {call_id}")
                except Exception as e:
                    logger.warning(f"Failed to end Articom Core session for call {call_id}: {e}")

            self.transcript_store.pop(call_info.session_id, None)

        if call_info.adk_task:
            call_info.adk_task.cancel()
            try:
                await call_info.adk_task
            except (asyncio.CancelledError, TypeError):
                pass

        if call_info.rtp_pacing_task:
            call_info.rtp_pacing_task.cancel()
            try:
                await call_info.rtp_pacing_task
            except asyncio.CancelledError:
                pass

        if call_info.audio_inject_task:
            call_info.audio_inject_task.cancel()
            try:
                await call_info.audio_inject_task
            except asyncio.CancelledError:
                pass
            unregister_session_audio_queue(call_info.session_id)

        try:
            await self.session_service.delete_session(
                app_name=self.app_name,
                user_id=call_info.user_id,
                session_id=call_info.session_id,
            )
        except Exception as e:
            logger.warning(f"Failed to delete session: {e}")

        logger.info(f"Call terminated: {call_id}")

    def _parse_rtp_address_from_sdp(self, sdp: str) -> Optional[Tuple[str, int]]:
        ip = None
        port = None
        c_match = re.search(r"c=IN IP4 (\S+)", sdp)
        if c_match:
            ip = c_match.group(1)
        m_match = re.search(r"m=audio (\d+)", sdp)
        if m_match:
            port = int(m_match.group(1))
        if ip and port:
            return (ip, port)
        return None

    def _generate_sdp_answer(self, codec_type: CodecType) -> str:
        if codec_type == CodecType.ULAW:
            payload_type = 0
            codec_name = "PCMU"
        else:
            payload_type = 8
            codec_name = "PCMA"

        from app.config import POD_IP, SIP_SDP_HOST, SIP_SDP_PORT

        sdp_host = POD_IP or SIP_SDP_HOST or self._get_local_ip()
        sdp_port = str(SIP_SDP_PORT or self.rtp_port)

        sdp_lines = [
            "v=0",
            f"o=- 0 0 IN IP4 {sdp_host}",
            "s=ADK Voice Agent",
            f"c=IN IP4 {sdp_host}",
            "t=0 0",
            f"m=audio {sdp_port} RTP/AVP {payload_type}",
            f"a=rtpmap:{payload_type} {codec_name}/8000",
            "a=sendrecv",
            "a=ptime:20",
        ]
        return "\r\n".join(sdp_lines) + "\r\n"

    @staticmethod
    def _get_local_ip() -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"


# ── Module-level API ─────────────────────────────────────────────────

_sip_server: Optional[NativeSIPServer] = None


def get_sip_server() -> Optional[NativeSIPServer]:
    return _sip_server


async def start_native_sip_server(
    runner: Runner,
    session_service: InMemorySessionService,
    app_name: str,
    institute_id: str = "",
    greeting_message: str = "Hello! How can I help you today?",
) -> NativeSIPServer:
    global _sip_server

    _sip_server = NativeSIPServer(
        runner=runner,
        session_service=session_service,
        app_name=app_name,
        institute_id=institute_id,
        greeting_message=greeting_message,
        sip_port=SIP_PORT,
        rtp_port=SIP_SDP_PORT,
        bind_address=SIP_BIND_ADDRESS,
    )
    await _sip_server.start()
    return _sip_server


async def stop_native_sip_server() -> None:
    global _sip_server
    if _sip_server:
        await _sip_server.stop()
        _sip_server = None
