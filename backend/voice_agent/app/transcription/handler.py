"""Transcript handler for recording and managing conversation transcripts."""

import json
import logging
from typing import TYPE_CHECKING, Dict, List, Optional

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class TranscriptHandler:
    """Handles transcript recording for bidirectional ADK streaming sessions."""

    def __init__(self, session_id: str, transcript_store: Dict[str, List[dict]], langfuse=None):
        """Initialize transcript handler.

        Args:
            session_id: Unique session identifier
            transcript_store: Shared dictionary to store transcripts across sessions
        """
        self.session_id = session_id
        self.transcript_store = transcript_store
        self.langfuse = langfuse
        # Buffers for accumulating streaming responses
        self.current_agent_text: List[str] = []
        self.current_agent_audio_transcript: List[str] = []
        self.suppress_agent_output: bool = False

        # Accumulate usage metadata across all turns
        self.total_usage: Dict[str, int] = {"input": 0, "output": 0, "total": 0}

        # Initialize transcript storage for this session
        if session_id not in transcript_store:
            transcript_store[session_id] = []
            logger.debug(f"Initialized transcript store for session: {session_id}")

    def record_message(self, role: str, message: str, timestamp: Optional[str] = None) -> None:
        """Record a message in the transcript.

        Args:
            role: Message role ('user', 'agent', 'system')
            message: Message content
            timestamp: Optional ISO format timestamp (defaults to now)
        """
        if not message:
            return

        entry = {
            "actor": role,
            "message": message,
            # "timestamp": timestamp or datetime.now().isoformat()
        }

        self.transcript_store[self.session_id].append(entry)
        logger.info(f"Recorded {role.upper()} message: {message[:100]}{'...' if len(message) > 100 else ''}")

    def record_greeting(self, greeting_message: str) -> None:
        """Record the initial greeting message.

        Args:
            greeting_message: Greeting text to record
        """
        self.record_message("bot", greeting_message)

    def process_event(self, event_json: str) -> None:
        """Process an ADK event and extract transcript information.

        Args:
            event_json: JSON string of the ADK event
        """
        try:
            data = json.loads(event_json)

            # Handle interruptions early to drop partial agent output
            self._handle_interruption(data)

            # Handle user transcript (input audio)
            self._process_input_transcription(data)

            # Accumulate agent responses (text or audio)
            self._accumulate_agent_response(data)

            # Process usage metadata if available
            self._process_usage_metadata(data)

            # Detect end of turn and save accumulated transcript
            self._process_turn_complete(data)

        except Exception as e:
            logger.error(f"Error processing transcript event: {e}")

    def _process_usage_metadata(self, data: dict) -> None:
        """Accumulate usage metadata from ADK events.

        ADK usage metadata contains (camelCase JSON keys):
        - promptTokenCount: input prompt tokens
        - candidatesTokenCount: output/completion tokens (often absent in bidi streaming)
        - thoughtsTokenCount: thinking/reasoning tokens (may be absent)
        - totalTokenCount: total tokens used

        In bidi streaming mode, candidatesTokenCount is often not reported.`
        We derive it from: totalTokenCount - promptTokenCount - thoughtsTokenCount

        Args:
            data: Parsed event data
        """
        if "usageMetadata" not in data:
            return

        usage = data["usageMetadata"]

        # Log the raw usage metadata for debugging
        logger.info(f"Raw usageMetadata from ADK event: {json.dumps(usage)}")

        prompt_tokens = usage.get("promptTokenCount", 0) or 0
        candidates_tokens = usage.get("candidatesTokenCount", 0) or 0
        thoughts_tokens = usage.get("thoughtsTokenCount", 0) or 0
        total_tokens = usage.get("totalTokenCount", 0) or 0

        # If candidatesTokenCount is not reported (common in bidi streaming),
        # derive output tokens from total - prompt - thoughts
        if candidates_tokens == 0 and total_tokens > 0 and prompt_tokens > 0:
            derived_output = total_tokens - prompt_tokens - thoughts_tokens
            if derived_output > 0:
                logger.info(
                    f"candidatesTokenCount not reported, deriving output tokens: "
                    f"{total_tokens} (total) - {prompt_tokens} (prompt) - {thoughts_tokens} (thoughts) = {derived_output}"
                )
                candidates_tokens = derived_output

        self.total_usage["input"] += prompt_tokens
        self.total_usage["output"] += candidates_tokens
        self.total_usage["total"] += total_tokens

        # Track thoughts tokens if present
        if thoughts_tokens > 0:
            self.total_usage["thoughts"] = self.total_usage.get("thoughts", 0) + thoughts_tokens

        logger.info(f"Accumulated usage so far: {self.total_usage}")

    def _process_input_transcription(self, data: dict) -> None:
        """Process input audio transcription from user.

        Args:
            data: Parsed event data
        """
        if "inputTranscription" in data:
            input_transcription = data["inputTranscription"]
            user_transcript = input_transcription.get("text")
            is_finished = input_transcription.get("finished", False)

            if user_transcript and is_finished:
                self.record_message("user", user_transcript)
                # User finished speaking; allow new agent output after an interrupt
                if self.suppress_agent_output:
                    self.suppress_agent_output = False

    def _accumulate_agent_response(self, data: dict) -> None:
        """Accumulate agent response chunks (text or audio transcript).

        Args:
            data: Parsed event data
        """
        if self.suppress_agent_output:
            return

        # Case 1: Standard text responses (text models)
        # These arrive as small deltas that need to be accumulated
        if "content" in data and "parts" in data["content"]:
            for part in data["content"]["parts"]:
                if "text" in part and part["text"]:
                    self.current_agent_text.append(part["text"])

        # Case 2: Audio transcript responses (audio models)
        # These arrive as cumulative text (not deltas), so we store the latest one
        # and only save it when finished
        if "outputTranscription" in data:
            output_transcription = data["outputTranscription"]
            transcript_text = output_transcription.get("text")
            is_finished = output_transcription.get("finished", False)

            if transcript_text:
                # Replace (not append) since it's cumulative
                self.current_agent_audio_transcript = [transcript_text]

    def _process_turn_complete(self, data: dict) -> None:
        """Process turn completion and save accumulated agent response.

        Args:
            data: Parsed event data
        """
        if data.get("turnComplete") is True:
            if self.suppress_agent_output:
                # Drop any partial content from an interrupted response
                self.current_agent_text = []
                self.current_agent_audio_transcript = []
                return

            final_message = ""

            # Prioritize audio transcript if available (voice mode), else text
            if self.current_agent_audio_transcript:
                final_message = "".join(self.current_agent_audio_transcript)
            elif self.current_agent_text:
                final_message = "".join(self.current_agent_text)

            if final_message:
                self.record_message("bot", final_message)

            # Reset buffers for next turn
            self.current_agent_text = []
            self.current_agent_audio_transcript = []

    def _handle_interruption(self, data: dict) -> None:
        """Handle interruption events to drop partial agent output."""
        if data.get("interrupted") is True:
            self.suppress_agent_output = True
            self.current_agent_text = []
            self.current_agent_audio_transcript = []
            logger.info("Agent interrupted — clearing current agent transcript buffers")

    def log_transcript(self, prefix: str = "SESSION TRANSCRIPT") -> None:
        """Log the complete transcript to the logger.

        Args:
            prefix: Prefix for the transcript header (e.g., "SESSION TRANSCRIPT" or "SIP CALL TRANSCRIPT")
        """
        if self.session_id not in self.transcript_store:
            logger.warning(f"No transcript found for session: {self.session_id}")
            return

        transcript = self.transcript_store[self.session_id]

        logger.info(f"\n{'=' * 80}")
        logger.info(f"{prefix} - Session ID: {self.session_id}")
        logger.info(f"{'=' * 80}")

        # logger.info(transcript)

        for idx, entry in enumerate(transcript, 1):
            actor_display = entry["actor"].upper()
            # timestamp = entry['timestamp']
            message = entry["message"]
            # logger.info(f"\n[{idx}] {actor_display} ({timestamp}):")
            logger.info(f"\n[{idx}] {actor_display}:")
            logger.info(f"{message}")

        logger.info(f"\n{'=' * 80}")
        logger.info(f"END OF TRANSCRIPT - Total messages: {len(transcript)}")
        logger.info(f"{'=' * 80}\n")

    def finalize(self) -> None:
        """Flush any pending partial agent output before session teardown.

        If the connection drops mid-turn (before turnComplete), this saves
        whatever text/audio transcript has been accumulated so far.
        """
        if self.suppress_agent_output:
            self.current_agent_text = []
            self.current_agent_audio_transcript = []
            return

        final_message = ""
        if self.current_agent_audio_transcript:
            final_message = "".join(self.current_agent_audio_transcript)
        elif self.current_agent_text:
            final_message = "".join(self.current_agent_text)

        if final_message:
            self.record_message("bot", final_message)
            logger.info("Finalized partial agent output on session close")

        self.current_agent_text = []
        self.current_agent_audio_transcript = []

    def clear_transcript(self) -> None:
        """Clear the transcript for this session."""
        if self.session_id in self.transcript_store:
            del self.transcript_store[self.session_id]
            logger.debug(f"Cleared transcript for session: {self.session_id}")

    def resume_agent_output(self) -> None:
        """Allow agent output after a manual user message."""
        self.suppress_agent_output = False

    def get_transcript(self) -> List[dict]:
        """Get the transcript entries for this session.

        Returns:
            List of transcript entries
        """
        return self.transcript_store.get(self.session_id, [])

    def get_accumulated_usage(self) -> Dict[str, int]:
        return self.total_usage.copy()

    def get_conversation_context(self) -> Dict[str, List[str]]:
        """Get accumulated inputs and outputs for the session."""
        transcript = self.get_transcript()
        inputs = [entry["message"] for entry in transcript if entry["actor"] == "user"]
        outputs = [entry["message"] for entry in transcript if entry["actor"] == "bot"]
        return {"input": inputs, "output": outputs}
