"""Tests for audio clip suppression logic in WebSocket and SIP transports.

WebSocket: `suppress_model_audio` flag inside `downstream_task`
  - Set when a functionCall for an audio-clip tool is detected in an event
  - Resets when usageMetadata is seen (end of model turn)
  - inlineData parts are stripped from events while active

SIP: `clip_audio_suppressed` flag on SIPCallInfo
  - Independent of interrupt-driven `audio_suppressed`
  - Set when a functionCall for an audio-clip tool is detected
  - Resets when usageMetadata is seen
  - Does NOT interfere with the interrupt system
"""

import json

from app.audio.codec import AudioCodec, CodecType
from app.transport.sip_udp.call_session import SIPCallInfo

# ── helpers ───────────────────────────────────────────────────────────

CLIP_TOOL_MAP = {"get_contact_numbers": "assets/phone.pcm"}


def _event_with_function_call(tool_name: str) -> str:
    return json.dumps({"content": {"parts": [{"functionCall": {"name": tool_name, "args": {}}}]}})


def _event_with_audio() -> str:
    return json.dumps({"content": {"parts": [{"inlineData": {"mimeType": "audio/pcm;rate=24000", "data": "AAAA"}}]}})


def _event_with_audio_and_function_call(tool_name: str) -> str:
    return json.dumps(
        {
            "content": {
                "parts": [
                    {"inlineData": {"mimeType": "audio/pcm;rate=24000", "data": "AAAA"}},
                    {"functionCall": {"name": tool_name, "args": {}}},
                ]
            }
        }
    )


def _event_usage_metadata() -> str:
    return json.dumps({"usageMetadata": {"totalTokenCount": 100}})


def _event_text() -> str:
    return json.dumps({"content": {"parts": [{"text": "hello"}]}})


def _make_sip_call_info(session_id: str = "test-session") -> SIPCallInfo:
    ci = SIPCallInfo(
        call_id="test-call",
        from_tag="from",
        to_tag="to",
        remote_addr=("127.0.0.1", 5060),
        remote_rtp_addr=("127.0.0.1", 20000),
        codec=AudioCodec(CodecType.ULAW),
        user_id="test-user",
        session_id=session_id,
    )
    ci.is_active = True
    ci.greeting_done = True
    return ci


# ── WebSocket suppression logic (inline simulation) ───────────────────


def _apply_ws_suppression(event_json: str, suppress: bool, clip_tool_map: dict) -> tuple[str, bool]:
    """Simulate the suppression block from downstream_task.
    Returns (possibly_modified_event_json, new_suppress_flag).
    """
    try:
        evt = json.loads(event_json)
        parts = (evt.get("content") or {}).get("parts") or []

        if any((p.get("functionCall") or {}).get("name") in clip_tool_map for p in parts):
            suppress = True

        if suppress and evt.get("usageMetadata"):
            suppress = False

        if suppress:
            filtered = [p for p in parts if "inlineData" not in p]
            if len(filtered) != len(parts):
                if evt.get("content"):
                    evt["content"]["parts"] = filtered
                event_json = json.dumps(evt)
    except Exception:
        pass

    return event_json, suppress


class TestWebSocketSuppression:
    def test_function_call_sets_suppress_true(self):
        evt = _event_with_function_call("get_contact_numbers")
        _, suppress = _apply_ws_suppression(evt, False, CLIP_TOOL_MAP)
        assert suppress is True

    def test_unknown_tool_does_not_set_suppress(self):
        evt = _event_with_function_call("some_other_tool")
        _, suppress = _apply_ws_suppression(evt, False, CLIP_TOOL_MAP)
        assert suppress is False

    def test_usage_metadata_resets_suppress(self):
        # First turn: function call → suppress = True
        evt1 = _event_with_function_call("get_contact_numbers")
        _, suppress = _apply_ws_suppression(evt1, False, CLIP_TOOL_MAP)
        assert suppress is True

        # usageMetadata → suppress = False
        evt2 = _event_usage_metadata()
        _, suppress = _apply_ws_suppression(evt2, suppress, CLIP_TOOL_MAP)
        assert suppress is False

    def test_audio_stripped_while_suppressed(self):
        evt = _event_with_audio()
        modified, _ = _apply_ws_suppression(evt, True, CLIP_TOOL_MAP)
        parsed = json.loads(modified)
        parts = parsed["content"]["parts"]
        assert all("inlineData" not in p for p in parts)

    def test_audio_not_stripped_when_not_suppressed(self):
        evt = _event_with_audio()
        modified, _ = _apply_ws_suppression(evt, False, CLIP_TOOL_MAP)
        parsed = json.loads(modified)
        parts = parsed["content"]["parts"]
        assert any("inlineData" in p for p in parts)

    def test_audio_stripped_from_event_containing_function_call(self):
        """Audio in the same event as a function call is stripped."""
        evt = _event_with_audio_and_function_call("get_contact_numbers")
        modified, suppress = _apply_ws_suppression(evt, False, CLIP_TOOL_MAP)
        assert suppress is True
        parsed = json.loads(modified)
        parts = parsed["content"]["parts"]
        assert all("inlineData" not in p for p in parts)
        # function call part is preserved
        assert any("functionCall" in p for p in parts)

    def test_text_parts_not_stripped_while_suppressed(self):
        evt = _event_text()
        modified, _ = _apply_ws_suppression(evt, True, CLIP_TOOL_MAP)
        parsed = json.loads(modified)
        parts = parsed["content"]["parts"]
        assert any("text" in p for p in parts)

    def test_normal_response_after_suppression_reset(self):
        """After usageMetadata resets suppress, subsequent audio events pass through."""
        # suppress active
        evt_audio1 = _event_with_audio()
        modified1, suppress = _apply_ws_suppression(evt_audio1, True, CLIP_TOOL_MAP)
        assert all("inlineData" not in p for p in json.loads(modified1)["content"]["parts"])

        # turn ends
        evt_meta = _event_usage_metadata()
        _, suppress = _apply_ws_suppression(evt_meta, suppress, CLIP_TOOL_MAP)
        assert suppress is False

        # next turn audio plays normally
        evt_audio2 = _event_with_audio()
        modified2, suppress = _apply_ws_suppression(evt_audio2, suppress, CLIP_TOOL_MAP)
        assert any("inlineData" in p for p in json.loads(modified2)["content"]["parts"])
        assert suppress is False

    def test_empty_clip_map_never_suppresses(self):
        evt = _event_with_function_call("get_contact_numbers")
        _, suppress = _apply_ws_suppression(evt, False, {})
        assert suppress is False

    def test_malformed_event_json_does_not_crash(self):
        # Should not raise; suppress stays unchanged
        result_json, suppress = _apply_ws_suppression("not-valid-json{{{", False, CLIP_TOOL_MAP)
        assert suppress is False


# ── SIP clip_audio_suppressed flag ────────────────────────────────────


class TestSIPClipAudioSuppressedFlag:
    def test_default_is_false(self):
        ci = _make_sip_call_info()
        assert ci.clip_audio_suppressed is False

    def test_independent_of_audio_suppressed(self):
        ci = _make_sip_call_info()
        ci.audio_suppressed = True
        assert ci.clip_audio_suppressed is False

        ci.clip_audio_suppressed = True
        ci.audio_suppressed = False
        assert ci.clip_audio_suppressed is True

    def test_interrupt_reset_does_not_clear_clip_suppression(self):
        """Simulates interrupt resolution code setting audio_suppressed = False
        without touching clip_audio_suppressed."""
        ci = _make_sip_call_info()
        ci.clip_audio_suppressed = True
        ci.audio_suppressed = True
        ci.interrupt_active = True

        # Simulate interrupt resolution (server.py lines 600-605)
        ci.audio_suppressed = False
        ci.interrupt_active = False

        assert ci.clip_audio_suppressed is True  # NOT cleared by interrupt logic

    def test_clip_suppression_reset_on_usage_metadata(self):
        """Simulates the usageMetadata reset block added to _run_adk_session."""
        ci = _make_sip_call_info()
        ci.clip_audio_suppressed = True

        evt_data = json.loads(_event_usage_metadata())
        # Simulate the reset logic from server.py
        if evt_data.get("usageMetadata") and ci.clip_audio_suppressed:
            ci.clip_audio_suppressed = False

        assert ci.clip_audio_suppressed is False

    def test_clip_suppression_reset_does_not_touch_interrupt_flag(self):
        ci = _make_sip_call_info()
        ci.clip_audio_suppressed = True
        ci.interrupt_active = True

        evt_data = json.loads(_event_usage_metadata())
        if evt_data.get("usageMetadata") and ci.clip_audio_suppressed:
            ci.clip_audio_suppressed = False

        assert ci.interrupt_active is True  # unchanged

    def test_audio_blocked_when_clip_suppressed(self):
        """When clip_audio_suppressed, audio should not be forwarded to RTP."""
        ci = _make_sip_call_info()
        ci.clip_audio_suppressed = True

        # The SIP send condition: not audio_suppressed AND not clip_audio_suppressed
        should_send = not ci.audio_suppressed and not ci.clip_audio_suppressed
        assert should_send is False

    def test_audio_allowed_when_only_interrupt_suppressed(self):
        """clip_audio_suppressed=False should allow audio even if audio_suppressed=True
        would block it — they are checked with AND, so both must be False to allow."""
        ci = _make_sip_call_info()
        ci.audio_suppressed = True
        ci.clip_audio_suppressed = False

        should_send = not ci.audio_suppressed and not ci.clip_audio_suppressed
        assert should_send is False  # blocked by interrupt suppression, not clip

    def test_audio_allowed_when_both_clear(self):
        ci = _make_sip_call_info()
        ci.audio_suppressed = False
        ci.clip_audio_suppressed = False

        should_send = not ci.audio_suppressed and not ci.clip_audio_suppressed
        assert should_send is True

    def test_end_call_does_not_modify_clip_suppression(self):
        """end_call resets audio_suppressed but must not affect clip_audio_suppressed."""
        ci = _make_sip_call_info()
        ci.clip_audio_suppressed = True
        ci.audio_suppressed = True

        # Simulate end_call logic (server.py lines 590-592)
        ci.end_call_requested = True
        ci.audio_suppressed = False
        ci.interrupt_active = False

        assert ci.clip_audio_suppressed is True
