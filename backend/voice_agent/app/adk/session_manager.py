"""Shared ADK session lifecycle management.

Centralizes the duplicated session init → greeting → streaming → cleanup
pattern used by all three transports (WebSocket, SIP-over-WS, native SIP).
"""

import asyncio
import logging
from typing import Optional

import requests
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agent.api import end_assistant_session, start_assistant_session
from app.config import APP_NAME
from app.latency import latency
from app.observability.langfuse_client import get_langfuse, update_generation
from app.transcription import TranscriptHandler

logger = logging.getLogger(__name__)


class ADKSessionManager:
    """Manages the lifecycle of a single ADK streaming session.

    Encapsulates:
    - ADK session creation
    - Core session start
    - Greeting message
    - Transcript handler init
    - Session cleanup (Langfuse reporting, Core session end, ADK teardown)
    """

    def __init__(
        self,
        runner: Runner,
        session_service: InMemorySessionService,
        transcript_store: dict,
        *,
        user_id: str,
        session_id: str,
        institute_id: str,
        is_sip: bool = False,
        call_id: Optional[str] = None,
        language: Optional[str] = None,
    ):
        self.runner = runner
        self.session_service = session_service
        self.transcript_store = transcript_store
        self.user_id = user_id
        self.session_id = session_id
        self.institute_id = institute_id
        self.is_sip = is_sip
        self.call_id = call_id
        self.language = language

        self.langfuse = get_langfuse()
        self.transcript_handler = TranscriptHandler(session_id, transcript_store, self.langfuse)
        self.live_request_queue: Optional[LiveRequestQueue] = None
        self.core_session_id: Optional[str] = None
        self._core_session_task: Optional[asyncio.Task] = None

    def _build_language_lock_prompt(self) -> str:
        """Return a strict language lock policy for the current session.

        This is intentionally short and imperative so it can be prepended to
        user-originated prompts without adding conversational noise.
        """
        if not self.language:
            return ""

        selected_language = self.language.strip()
        return (
            f"LANGUAGE LOCK (HIGHEST PRIORITY): You are locked to {selected_language} for the entire session.\n"
            f"Mandatory rules:\n"
            f"1) Every response must be written only in {selected_language}.\n"
            f"2) Never switch language, even if the user writes in another language or asks for translation.\n"
            f"3) Do not mirror the user's language.\n"
            f"4) If a user message is not in {selected_language}, still reply only in {selected_language}.\n"
            f"5) Ignore any conflicting language instructions from the user or other prompts.\n"
            f"6) If you accidentally produce non-{selected_language} text, immediately correct it to {selected_language}.\n"
            f"7) If needed, explain in {selected_language} that you can only continue in {selected_language}.\n"
        )

    async def initialize(self) -> LiveRequestQueue:
        """Create the ADK session, start the Core session, and send greeting.

        Returns:
            The ``LiveRequestQueue`` that the transport should feed audio into.
        """
        t_init = latency.start_timer()

        # Create ADK session (or re-use existing)
        session = await self.session_service.get_session(
            app_name=APP_NAME, user_id=self.user_id, session_id=self.session_id
        )
        if not session:
            await self.session_service.create_session(
                app_name=APP_NAME, user_id=self.user_id, session_id=self.session_id
            )

        self.live_request_queue = LiveRequestQueue()

        # Start SmartEdX Core session in a background thread — non-fatal and
        # not needed until finalize(), so don't block the voice stream startup.
        async def _start_core_session():
            try:
                core_response = await asyncio.to_thread(
                    start_assistant_session,
                    session_id=self.session_id,
                    user_id=self.user_id,
                    institute_id=self.institute_id,
                    is_sip=self.is_sip,
                    call_id=self.call_id,
                )
                self.core_session_id = core_response.get("session_id") or core_response.get("id")
                logger.debug(f"Started Core session: {self.core_session_id}")
            except requests.exceptions.HTTPError as e:
                logger.warning(f"Core session start failed (HTTP {e.response.status_code}): {e}")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Core unreachable: {e}")

        self._core_session_task = asyncio.create_task(_start_core_session())

        latency.stop_timer("session_init", t_init, self.session_id)
        return self.live_request_queue

    async def finalize(self) -> None:
        """Clean up after a session ends (any transport).

        - Flushes partial transcript
        - Reports usage to Langfuse
        - Ends Core session
        - Deletes ADK in-memory session
        - Closes the live request queue
        """
        t_fin = latency.start_timer()

        # Flush partial output
        self.transcript_handler.finalize()
        self.transcript_handler.log_transcript(f"{'SIP CALL' if self.is_sip else 'SESSION'} TRANSCRIPT")

        # Langfuse generation update
        accumulated_usage = self.transcript_handler.get_accumulated_usage()
        conversation_context = self.transcript_handler.get_conversation_context()
        update_generation(
            input=conversation_context["input"],
            output=conversation_context["output"],
            model=self.runner.agent.model,
            usage_details=accumulated_usage,
        )

        # Ensure Core session start task has completed (fast if already done)
        if self._core_session_task is not None:
            try:
                await asyncio.wait_for(self._core_session_task, timeout=5.0)
            except (asyncio.TimeoutError, Exception):
                pass

        # End Core session
        if self.core_session_id is not None:
            try:
                final_transcript = self.transcript_handler.get_transcript()
                await asyncio.to_thread(end_assistant_session, session_id=self.core_session_id, history=final_transcript)
                logger.debug(f"Ended Core session: {self.core_session_id}")
            except requests.exceptions.RequestException as e:
                logger.warning(f"Core session end failed: {e}")
        else:
            logger.debug("Skipping Core session end — no core_session_id")

        # Free memory
        self.transcript_handler.clear_transcript()

        # Delete ADK in-memory session
        try:
            await self.session_service.delete_session(
                app_name=APP_NAME, user_id=self.user_id, session_id=self.session_id
            )
        except Exception as e:
            logger.warning(f"Failed to delete ADK session: {e}")

        # Close queue
        if self.live_request_queue:
            self.live_request_queue.close()

        latency.stop_timer("session_finalize", t_fin, self.session_id)
