"""Unit tests for app.agent.audio_clips module.

Covers:
- Session queue registration / unregistration
- Thread-safe audio enqueuing
- PCM and WAV file loading (including header stripping)
- WebSocket audio event formatting
- Audio clip FunctionTool creation and invocation
- Tool behaviour when audio file is missing
"""

import asyncio
import base64
import json
import struct
from unittest.mock import MagicMock

import pytest

from app.agent.audio_clips import (
    _registry,
    _registry_lock,
    create_audio_clip_tool,
    load_audio_pcm,
    make_websocket_audio_event,
    queue_audio_for_session,
    register_session_audio_queue,
    unregister_session_audio_queue,
)

# ── helpers ───────────────────────────────────────────────────────────


def _make_tool_context(session_id: str) -> MagicMock:
    ctx = MagicMock()
    ctx.session.id = session_id
    return ctx


def _make_wav_bytes(pcm_payload: bytes, sample_rate: int = 24000) -> bytes:
    """Build a minimal valid RIFF/WAV file wrapping *pcm_payload*."""
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = len(pcm_payload)
    chunk_size = 36 + data_size

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,  # subchunk1 size (PCM)
        1,  # audio format (PCM)
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + pcm_payload


# ── Session queue management ──────────────────────────────────────────


class TestSessionQueueManagement:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_register_returns_queue(self):
        q = register_session_audio_queue("sess-reg-1")
        assert q is not None
        assert isinstance(q, asyncio.Queue)
        unregister_session_audio_queue("sess-reg-1")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_register_stores_in_registry(self):
        register_session_audio_queue("sess-reg-2")
        with _registry_lock:
            assert "sess-reg-2" in _registry
        unregister_session_audio_queue("sess-reg-2")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_unregister_removes_from_registry(self):
        register_session_audio_queue("sess-unreg-1")
        unregister_session_audio_queue("sess-unreg-1")
        with _registry_lock:
            assert "sess-unreg-1" not in _registry

    @pytest.mark.asyncio(loop_scope="function")
    async def test_unregister_nonexistent_is_safe(self):
        # Should not raise
        unregister_session_audio_queue("sess-does-not-exist")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_queue_audio_returns_false_when_no_queue(self):
        result = queue_audio_for_session("sess-no-queue", b"\x00" * 100)
        assert result is False

    @pytest.mark.asyncio(loop_scope="function")
    async def test_queue_audio_delivers_bytes(self):
        q = register_session_audio_queue("sess-deliver-1")
        payload = b"\x01\x02\x03\x04"
        result = queue_audio_for_session("sess-deliver-1", payload)
        assert result is True
        received = await asyncio.wait_for(q.get(), timeout=1.0)
        assert received == payload
        unregister_session_audio_queue("sess-deliver-1")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_queue_audio_multiple_clips_in_order(self):
        q = register_session_audio_queue("sess-order-1")
        clips = [bytes([i] * 10) for i in range(5)]
        for clip in clips:
            queue_audio_for_session("sess-order-1", clip)
        # Allow the event loop to process the call_soon_threadsafe callbacks
        await asyncio.sleep(0)
        received = []
        for _ in clips:
            received.append(await asyncio.wait_for(q.get(), timeout=1.0))
        assert received == clips
        unregister_session_audio_queue("sess-order-1")


# ── Audio file loading ────────────────────────────────────────────────


class TestLoadAudioPcm:
    def test_load_raw_pcm_file(self, tmp_path):
        pcm = b"\x10\x20" * 100
        f = tmp_path / "audio.pcm"
        f.write_bytes(pcm)
        result = load_audio_pcm(str(f))
        assert result == pcm

    def test_load_wav_strips_header(self, tmp_path):
        pcm_payload = b"\xab\xcd" * 200
        wav_data = _make_wav_bytes(pcm_payload)
        f = tmp_path / "audio.wav"
        f.write_bytes(wav_data)
        result = load_audio_pcm(str(f))
        assert result == pcm_payload

    def test_load_wav_non_44_byte_header(self, tmp_path):
        """WAV files can have headers != 44 bytes; wave module must handle it."""
        pcm_payload = b"\x11\x22" * 50
        wav_data = _make_wav_bytes(pcm_payload)
        f = tmp_path / "audio.wav"
        f.write_bytes(wav_data)
        result = load_audio_pcm(str(f))
        assert result == pcm_payload

    def test_load_missing_file_returns_none(self):
        result = load_audio_pcm("/nonexistent/path/audio.pcm")
        assert result is None

    def test_load_relative_path_from_project_root(self, tmp_path, monkeypatch):
        """Relative paths are resolved from the project root."""
        import app.agent.audio_clips as mod

        pcm = b"\xff\xfe" * 10
        (tmp_path / "audio.pcm").write_bytes(pcm)
        monkeypatch.setattr(mod, "_PROJECT_ROOT", tmp_path)
        result = load_audio_pcm("audio.pcm")
        assert result == pcm

    def test_load_absolute_path_used_as_is(self, tmp_path):
        pcm = b"\x00\x01" * 20
        f = tmp_path / "abs.pcm"
        f.write_bytes(pcm)
        result = load_audio_pcm(str(f))
        assert result == pcm


# ── WebSocket event formatting ────────────────────────────────────────


class TestMakeWebsocketAudioEvent:
    def test_returns_valid_json(self):
        pcm = b"\x00\x01" * 10
        raw = make_websocket_audio_event(pcm)
        parsed = json.loads(raw)
        assert "content" in parsed
        assert "parts" in parsed["content"]

    def test_contains_inline_data(self):
        pcm = b"\x01\x02" * 8
        parsed = json.loads(make_websocket_audio_event(pcm))
        part = parsed["content"]["parts"][0]
        assert "inlineData" in part
        assert part["inlineData"]["mimeType"] == "audio/pcm;rate=24000"

    def test_data_is_base64_of_pcm(self):
        pcm = b"\xde\xad\xbe\xef" * 4
        parsed = json.loads(make_websocket_audio_event(pcm))
        encoded = parsed["content"]["parts"][0]["inlineData"]["data"]
        assert base64.b64decode(encoded) == pcm

    def test_custom_sample_rate(self):
        pcm = b"\x00" * 16
        parsed = json.loads(make_websocket_audio_event(pcm, sample_rate=16000))
        mime = parsed["content"]["parts"][0]["inlineData"]["mimeType"]
        assert "16000" in mime

    def test_default_sample_rate_is_24000(self):
        parsed = json.loads(make_websocket_audio_event(b"\x00" * 4))
        mime = parsed["content"]["parts"][0]["inlineData"]["mimeType"]
        assert "24000" in mime


# ── Audio clip tool factory ───────────────────────────────────────────


class TestCreateAudioClipTool:
    def test_tool_has_correct_name(self, tmp_path):
        (tmp_path / "a.pcm").write_bytes(b"\x00" * 100)
        tool = create_audio_clip_tool("get_contact_numbers", str(tmp_path / "a.pcm"))
        assert tool.name == "get_contact_numbers"

    def test_tool_has_description(self, tmp_path):
        (tmp_path / "a.pcm").write_bytes(b"\x00" * 100)
        tool = create_audio_clip_tool("my_tool", str(tmp_path / "a.pcm"), description="Test desc")
        assert "Test desc" in tool.func.__doc__

    def test_tool_default_description_contains_tool_name(self, tmp_path):
        (tmp_path / "a.pcm").write_bytes(b"\x00" * 100)
        tool = create_audio_clip_tool("get_contact_numbers", str(tmp_path / "a.pcm"))
        assert "get contact numbers" in tool.func.__doc__

    @pytest.mark.asyncio(loop_scope="function")
    async def test_tool_queues_audio_when_called(self, tmp_path):
        pcm = b"\x10\x20" * 50
        (tmp_path / "clip.pcm").write_bytes(pcm)
        tool = create_audio_clip_tool("test_tool", str(tmp_path / "clip.pcm"))

        q = register_session_audio_queue("sess-tool-1")
        ctx = _make_tool_context("sess-tool-1")
        result = tool.func(ctx)

        assert result["status"] == "success"
        assert result["audio_playing"] is True
        received = await asyncio.wait_for(q.get(), timeout=1.0)
        assert received == pcm
        unregister_session_audio_queue("sess-tool-1")

    @pytest.mark.asyncio(loop_scope="function")
    async def test_tool_succeeds_silently_when_audio_missing(self):
        tool = create_audio_clip_tool("ghost_tool", "/nonexistent/clip.pcm")
        q = register_session_audio_queue("sess-ghost-1")
        ctx = _make_tool_context("sess-ghost-1")
        result = tool.func(ctx)

        # Tool still returns success so the model gets a response
        assert result["status"] == "success"
        # Nothing should be in the queue
        assert q.empty()
        unregister_session_audio_queue("sess-ghost-1")

    def test_tool_succeeds_when_no_session_in_context(self, tmp_path):
        (tmp_path / "a.pcm").write_bytes(b"\x00" * 100)
        tool = create_audio_clip_tool("t", str(tmp_path / "a.pcm"))
        ctx = MagicMock()
        ctx.session = None
        result = tool.func(ctx)
        assert result["status"] == "success"

    def test_tool_result_contains_instruction(self, tmp_path):
        (tmp_path / "a.pcm").write_bytes(b"\x00" * 100)
        tool = create_audio_clip_tool("t", str(tmp_path / "a.pcm"))
        ctx = _make_tool_context("sess-instr-1")
        result = tool.func(ctx)
        assert "instruction" in result
        assert len(result["instruction"]) > 0

    @pytest.mark.asyncio(loop_scope="function")
    async def test_tool_loads_wav_correctly(self, tmp_path):
        pcm_payload = b"\xab\xcd" * 100
        wav_data = _make_wav_bytes(pcm_payload)
        (tmp_path / "clip.wav").write_bytes(wav_data)
        tool = create_audio_clip_tool("wav_tool", str(tmp_path / "clip.wav"))

        q = register_session_audio_queue("sess-wav-1")
        ctx = _make_tool_context("sess-wav-1")
        tool.func(ctx)

        received = await asyncio.wait_for(q.get(), timeout=1.0)
        assert received == pcm_payload
        unregister_session_audio_queue("sess-wav-1")
