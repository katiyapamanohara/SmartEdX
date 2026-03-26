"""Articom Voice Agent definition with Google ADK integration."""

import logging
import threading
import time

import requests
from fastembed import TextEmbedding
from google.adk.agents import Agent
from google.adk.tools import FunctionTool, ToolContext

from app.agent.api import fetch_assistant_config
from app.agent.audio_clips import create_audio_clip_tool
from app.agent.custom_tools import CustomToolHelper
from app.agent.instructions import all_instructions
from app.config import (
    ARTICOM_API_KEY,
    ARTICOM_ASSISTANT_ID,
    ARTICOM_MANIFEST_URL,
    ARTICOM_TOOLS_SECRET,
    AUDIO_CLIP_TOOL_MAP,
    CUSTOM_TOOLS_ENABLED,
    DEMO_AGENT_MODEL,
    END_CALL_INTERRUPT_COOLDOWN,
    GREETING_MESSAGE_OVERRIDE,
    MIN_USER_TURNS_BEFORE_END_CALL,
    QDRANT_API_KEY,
    QDRANT_COLLECTION_NAME,
    QDRANT_KB_ENABLED,
    QDRANT_URL,
    SYSTEM_INSTRUCTION_OVERRIDE,
)

logger = logging.getLogger(__name__)

_LANG_SUFFIXES = {"_sinhala": "Sinhala", "_tamil": "Tamil", "_english": "English"}


def _detect_tool_language(tool_name: str) -> str | None:
    for suffix, language in _LANG_SUFFIXES.items():
        if tool_name.endswith(suffix):
            return language
    return None


def _tool_base_name(tool_name: str) -> str:
    for suffix in _LANG_SUFFIXES:
        if tool_name.endswith(suffix):
            return tool_name[: -len(suffix)]
    return tool_name


# ── Fetch assistant configuration ────────────────────────────────────

try:
    config = fetch_assistant_config(ARTICOM_ASSISTANT_ID, ARTICOM_API_KEY)
    agents = config.get("workflows", {}).get("agents", [])
    _agent_cfg = next((a for a in agents if a.get("isDefaultAgent")), agents[0] if agents else {})
    greeting_message = _agent_cfg.get("greetingsMessage", "Hello! How can I help you today?")
    system_instructions = _agent_cfg.get("voiceInstructions") or "You are a helpful AI assistant"
except Exception as e:
    logger.error(f"Failed to fetch assistant config: {e}", exc_info=True)
    system_instructions = (
        "You are the Articom voice assistant.\n"
        "Follow the user's instructions carefully and provide accurate information.\n"
        "INSTRUCTIONS:\n"
        "- Greet the user with a friendly message.\n"
        "- Provide helpful and concise responses.\n"
        "- If you don't know the answer, politely say so.\n"
    )
    greeting_message = "Hello! How can I help you today?"

# Allow env-var override to replace API-fetched instructions entirely
if SYSTEM_INSTRUCTION_OVERRIDE:
    logger.info("Using SYSTEM_INSTRUCTION_OVERRIDE (API-fetched voiceInstructions replaced)")
    system_instructions = SYSTEM_INSTRUCTION_OVERRIDE

if GREETING_MESSAGE_OVERRIDE:
    logger.info("Using GREETING_MESSAGE_OVERRIDE (API-fetched greetingsMessage replaced)")
    greeting_message = GREETING_MESSAGE_OVERRIDE


# ── Custom tools ─────────────────────────────────────────────────────

try:
    custom_tools = []
    if CUSTOM_TOOLS_ENABLED:
        if not ARTICOM_MANIFEST_URL:
            raise ValueError("ARTICOM_MANIFEST_URL is not set")
        if ARTICOM_TOOLS_SECRET is None:
            raise ValueError("ARTICOM_TOOLS_SECRET is not set")
        tool_helper = CustomToolHelper()
        manifest = tool_helper.fetch_manifest(url=ARTICOM_MANIFEST_URL, secret=ARTICOM_TOOLS_SECRET)
        all_custom_tools = tool_helper.create_custom_tools(
            url=ARTICOM_MANIFEST_URL, manifest=manifest, secret=ARTICOM_TOOLS_SECRET
        )
        # Drop any manifest tool that has an audio clip override to avoid duplicate declarations
        custom_tools = [t for t in all_custom_tools if t.name not in AUDIO_CLIP_TOOL_MAP]
        skipped = [t.name for t in all_custom_tools if t.name in AUDIO_CLIP_TOOL_MAP]
        if skipped:
            logger.info(f"Skipped manifest tools overridden by audio clips: {skipped}")
        tool_instructions = tool_helper.generate_tool_instructions(manifest)
        system_instructions += "\n\n" + tool_instructions
except Exception as e:
    logger.error(f"Failed to load custom tools: {e}", exc_info=True)
    custom_tools = []


# ── Audio clip tool overrides ─────────────────────────────────────────
# Tools listed in AUDIO_CLIP_TOOL_MAP play a pre-recorded audio file instead
# of returning text for the model to speak.  Enabled per-bot via .env.

try:
    for _clip_tool_name, _clip_cfg in AUDIO_CLIP_TOOL_MAP.items():
        if isinstance(_clip_cfg, str):
            _clip_path, _clip_desc, _clip_rate = _clip_cfg, "", 24000
        else:
            _clip_path = _clip_cfg.get("path", "")
            _clip_desc = _clip_cfg.get("description", "")
            _clip_rate = int(_clip_cfg.get("sample_rate", 24000))

        _clip_lang = _detect_tool_language(_clip_tool_name)
        if _clip_desc:
            _final_desc = _clip_desc
        else:
            _final_desc = (
                f"Play a pre-recorded audio clip for {_tool_base_name(_clip_tool_name).replace('_', ' ')}. "
                "Call this only when the user explicitly asks for this exact information."
            )
        if _clip_lang:
            _final_desc += (
                f" LANGUAGE VARIANT: {_clip_lang}. "
                f"Only use this tool when the assistant response language must be {_clip_lang}."
            )

        _clip_tool = create_audio_clip_tool(_clip_tool_name, _clip_path, _final_desc, _clip_rate)
        custom_tools.append(_clip_tool)
        logger.info(f"Registered audio clip tool: {_clip_tool_name!r} -> {_clip_path!r}")
except Exception as e:
    logger.error(f"Failed to load audio clip tools: {e}", exc_info=True)


# ── Built-in tools ───────────────────────────────────────────────────

# ── Call guard registry ──────────────────────────────────────────────
# Shared state between transport layer and end_call tool so the tool
# itself can reject premature end_call attempts and return a "denied"
# response to the model (preventing it from saying goodbye).

_call_guards: dict = {}  # session_id -> {"user_turn_count": int, "last_interrupt_ts": float}
_guard_lock = threading.Lock()


def register_call_guard(session_id: str) -> None:
    with _guard_lock:
        _call_guards[session_id] = {"user_turn_count": 0, "last_interrupt_ts": 0.0}


def update_call_guard(session_id: str, **kwargs) -> None:
    with _guard_lock:
        if session_id in _call_guards:
            _call_guards[session_id].update(kwargs)


def unregister_call_guard(session_id: str) -> None:
    with _guard_lock:
        _call_guards.pop(session_id, None)


def end_call(tool_context: ToolContext) -> dict:
    """End the current phone call. ONLY call this tool when the user has EXPLICITLY said goodbye, bye, hang up, or clearly indicated they want to end the call with an unambiguous farewell.

    DO NOT call this tool if:
    - The user's speech was unclear, garbled, or too short to understand.
    - You are unsure what the user said.
    - The user asked a question or made a request.
    - There was silence or background noise.
    - You just want to wrap up — always wait for the user to end the conversation.

    Returns:
        Status of the call termination.
    """
    session_id = tool_context.session.id if tool_context.session else None
    with _guard_lock:
        guard = _call_guards.get(session_id) if session_id else None

    if guard:
        turns = guard["user_turn_count"]
        if turns < MIN_USER_TURNS_BEFORE_END_CALL:
            logger.warning(
                f"end_call DENIED by tool guard — only {turns}/{MIN_USER_TURNS_BEFORE_END_CALL} turns "
                f"(session {session_id})"
            )
            return {
                "status": "denied",
                "message": "You cannot end the call yet. The conversation has just started. "
                "Continue assisting the user. Ask them how you can help.",
            }
        last_ts = guard["last_interrupt_ts"]
        if last_ts > 0:
            elapsed = time.monotonic() - last_ts
            if elapsed < END_CALL_INTERRUPT_COOLDOWN:
                logger.warning(
                    f"end_call DENIED by tool guard — {elapsed:.1f}s since interrupt "
                    f"(cooldown {END_CALL_INTERRUPT_COOLDOWN}s, session {session_id})"
                )
                with _guard_lock:
                    _call_guards[session_id]["last_interrupt_ts"] = time.monotonic()
                return {
                    "status": "denied",
                    "message": "You cannot end the call right now. An interruption just occurred. "
                    "Continue assisting the user. Ask them what they need help with.",
                }

    return {"status": "call_ending", "message": "The call is being terminated."}


custom_tools.append(FunctionTool(func=end_call))


# ── Qdrant knowledge base search ────────────────────────────────────

_embedding_model = TextEmbedding("sentence-transformers/all-MiniLM-L6-v2") if QDRANT_KB_ENABLED else None


def search_knowledgebase(query: str, limit: int = 5) -> dict:
    """Search the knowledge base for relevant information.
    Use this tool when the user asks questions about products, services,
    pricing, installation, company details, or any domain-specific information.

    Args:
        query: The search query describing what information to find.
        limit: Maximum number of results to return.

    Returns:
        A dict with matching results from the knowledge base.
    """
    if not QDRANT_KB_ENABLED or _embedding_model is None:
        return {"status": "error", "message": "Knowledge base is not enabled."}
    try:
        query_vector = list(_embedding_model.embed([query]))[0].tolist()

        headers = {"Content-Type": "application/json"}
        if QDRANT_API_KEY:
            headers["api-key"] = QDRANT_API_KEY

        search_result = requests.post(
            f"{QDRANT_URL}/collections/{QDRANT_COLLECTION_NAME}/points/search",
            headers=headers,
            json={"vector": query_vector, "limit": limit, "with_payload": True},
            timeout=15,
        )
        search_result.raise_for_status()
        hits = search_result.json().get("result", [])

        if not hits:
            return {"status": "no_results", "message": "No relevant information found."}

        results = [
            {"content": h["payload"].get("content", ""), "page": h["payload"].get("page"), "score": h["score"]}
            for h in hits
        ]
        return {"status": "ok", "results": results}
    except Exception as e:
        logger.error(f"Knowledge base search failed: {e}", exc_info=True)
        return {"status": "error", "message": "Failed to search knowledge base."}


if QDRANT_KB_ENABLED:
    custom_tools.append(FunctionTool(func=search_knowledgebase))


# ── System instructions finalization ─────────────────────────────────

system_instructions = all_instructions + system_instructions

if QDRANT_KB_ENABLED:
    system_instructions += (
        "\n\nKNOWLEDGE BASE: You have access to a knowledge base via the `search_knowledgebase` tool. "
        "Use it to look up information about products, services, pricing, installation, "
        "company details, or any domain-specific questions the user asks."
    )
if CUSTOM_TOOLS_ENABLED:
    system_instructions += (
        "\n\nCUSTOM TOOLS: You have access to custom tools for domain-specific actions. Use them as instructed."
    )
if AUDIO_CLIP_TOOL_MAP:
    _clip_tool_names = ", ".join(f"`{n}`" for n in AUDIO_CLIP_TOOL_MAP)

    # Build routing rules for language variants (e.g. foo_english/foo_sinhala/foo_tamil).
    # This works even when there is no unsuffixed base tool.
    _lang_groups: dict[str, list[tuple[str, str]]] = {}
    for _tname in AUDIO_CLIP_TOOL_MAP:
        _lang = _detect_tool_language(_tname)
        if not _lang:
            continue
        _base = _tool_base_name(_tname)
        _lang_groups.setdefault(_base, []).append((_lang, _tname))

    _routing_lines: list[str] = []
    for _base, _variants in sorted(_lang_groups.items()):
        if len(_variants) < 2:
            continue
        _variant_text = "; ".join(f"{_lang} -> `{_tool}`" for _lang, _tool in sorted(_variants))
        _routing_lines.append(
            f"   - `{_base}` variants: {_variant_text}. "
            f"Pick by assistant response language lock first, not by user utterance language."
        )

    _routing_block = (
        ("\nLanguage routing — MUST follow:\n" + "\n".join(_routing_lines))
        if _routing_lines
        else ""
    )

    system_instructions += (
        f"\n\nAUDIO CLIP TOOLS — CRITICAL RULES:\n"
        f"The following tools play a pre-recorded audio clip directly to the user: {_clip_tool_names}.\n"
        f"Rules:\n"
        f"1. Call these tools ONLY when the user explicitly asks for that specific information.\n"
        f"2. Call each tool AT MOST ONCE per user request — never call the same tool twice in a row.\n"
        f"3. BEFORE calling the tool: say NOTHING — no 'let me check', no 'one moment', no filler. Call the tool immediately and silently.\n"
        f'4. AFTER the tool returns {{"audio_playing": true}}: do NOT repeat or read out any of the information that was in the audio. '
        f"Give only a brief natural follow-up (e.g. 'Is there anything else I can help you with?') and wait for the user.\n"
        f"5. Do NOT call the audio tool again unless the user explicitly asks for that information again.\n"
        f"6. If a session language lock exists, the audio clip language MUST match that locked language. "
        f"If the user asks in another language, keep using the locked-language audio variant.\n"
        f"{_routing_block}"
    )


# ── Agent instance ───────────────────────────────────────────────────

agent = Agent(
    name="ariticom_voice_agent",
    model=DEMO_AGENT_MODEL,
    tools=custom_tools,
    instruction=system_instructions,
)

__all__ = [
    "agent",
    "greeting_message",
    "register_call_guard",
    "search_knowledgebase",
    "unregister_call_guard",
    "update_call_guard",
]
