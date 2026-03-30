"""SmartEdX Voice Agent definition with Google ADK integration — per-institute."""

import logging
import threading
import time

import requests
from fastembed import TextEmbedding
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool, ToolContext

from app.agent.api import fetch_institute_config
from app.agent.assessment_tools import evaluate_voice_assessment
from app.agent.audio_clips import create_audio_clip_tool
from app.agent.custom_tools import CustomToolHelper
from app.agent.instructions import all_instructions
from app.config import (
    MANIFEST_URL,
    TOOLS_SECRET,
    AUDIO_CLIP_TOOL_MAP,
    APP_NAME,
    COURSE_KB_ENABLED,
    CUSTOM_TOOLS_ENABLED,
    DEMO_AGENT_MODEL,
    END_CALL_INTERRUPT_COOLDOWN,
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


# ── Call guard registry ──────────────────────────────────────────────
# Shared state between transport layer and end_call tool so the tool
# itself can reject premature end_call attempts.

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


# ── Shared tools (not institute-specific) ───────────────────────────

def _build_shared_tools() -> list:
    """Build tools that are shared across all institute agents."""
    tools: list = []

    # Custom tools from manifest
    try:
        if CUSTOM_TOOLS_ENABLED:
            if not MANIFEST_URL:
                raise ValueError("MANIFEST_URL is not set")
            if TOOLS_SECRET is None:
                raise ValueError("TOOLS_SECRET is not set")
            tool_helper = CustomToolHelper()
            manifest = tool_helper.fetch_manifest(url=MANIFEST_URL, secret=TOOLS_SECRET)
            all_custom_tools = tool_helper.create_custom_tools(
                url=MANIFEST_URL, manifest=manifest, secret=TOOLS_SECRET
            )
            tools = [t for t in all_custom_tools if t.name not in AUDIO_CLIP_TOOL_MAP]
            skipped = [t.name for t in all_custom_tools if t.name in AUDIO_CLIP_TOOL_MAP]
            if skipped:
                logger.info(f"Skipped manifest tools overridden by audio clips: {skipped}")
    except Exception as e:
        logger.error(f"Failed to load custom tools: {e}", exc_info=True)

    # Audio clip tool overrides
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
            tools.append(_clip_tool)
            logger.info(f"Registered audio clip tool: {_clip_tool_name!r} -> {_clip_path!r}")
    except Exception as e:
        logger.error(f"Failed to load audio clip tools: {e}", exc_info=True)

    tools.append(FunctionTool(func=end_call))
    tools.append(FunctionTool(func=evaluate_voice_assessment))

    if QDRANT_KB_ENABLED:
        tools.append(FunctionTool(func=search_knowledgebase))

    return tools


_shared_tools = _build_shared_tools()


# ── Per-institute agent/runner cache ────────────────────────────────

_institute_cache: dict[str, tuple[Runner, str]] = {}  # institute_id -> (runner, greeting_message)
_cache_lock = threading.Lock()


def _build_system_instructions(base_instructions: str, custom_tools_enabled: bool) -> str:
    """Append feature-specific instruction blocks to base instructions."""
    instructions = all_instructions + base_instructions

    if QDRANT_KB_ENABLED:
        instructions += (
            "\n\nKNOWLEDGE BASE: You have access to a knowledge base via the `search_knowledgebase` tool. "
            "Use it to look up information about products, services, pricing, installation, "
            "company details, or any domain-specific questions the user asks."
        )
    if custom_tools_enabled:
        instructions += (
            "\n\nCUSTOM TOOLS: You have access to custom tools for domain-specific actions. Use them as instructed."
        )
    if AUDIO_CLIP_TOOL_MAP:
        _clip_tool_names = ", ".join(f"`{n}`" for n in AUDIO_CLIP_TOOL_MAP)

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
            ("\nLanguage routing — MUST follow:\n" + "\n".join(_routing_lines)) if _routing_lines else ""
        )

        instructions += (
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

    return instructions


def get_runner_for_institute(institute_id: str, session_service: InMemorySessionService) -> tuple[Runner, str]:
    """Return a cached (Runner, greeting_message) for the given institute_id.

    On first call for a given institute, fetches the assistant config from the
    SmartEdX API and builds a dedicated Agent + Runner.  Subsequent calls for
    the same institute return the cached pair without any network I/O.
    """
    with _cache_lock:
        if institute_id in _institute_cache:
            return _institute_cache[institute_id]

    logger.info(f"Building agent for institute: {institute_id}")

    # Fetch institute-specific config from the SmartEdX institute service
    institute_name = "SmartEdX"
    base_instructions = (
        "You are the SmartEdX voice assistant.\n"
        "Follow the user's instructions carefully and provide accurate information.\n"
        "- Provide helpful and concise responses.\n"
        "- If you don't know the answer, politely say so.\n"
    )

    try:
        config = fetch_institute_config(institute_id)
        institute_name = config.get("name") or institute_name
        if config.get("voiceInstructions"):
            base_instructions = config["voiceInstructions"]
        else:
            base_instructions = (
                f"You are the AI voice assistant for {institute_name}.\n"
                "Help students with their voice assessments and learning needs.\n"
                "- Speak clearly and concisely.\n"
                "- Be encouraging and supportive.\n"
                "- If you don't know the answer, say so honestly.\n"
            )
        logger.info(f"Loaded voice config for institute '{institute_name}' ({institute_id})")
    except Exception as e:
        logger.error(f"Failed to fetch institute config for {institute_id}: {e}", exc_info=True)

    if SYSTEM_INSTRUCTION_OVERRIDE:
        logger.info(f"Using SYSTEM_INSTRUCTION_OVERRIDE for institute {institute_id}")
        base_instructions = SYSTEM_INSTRUCTION_OVERRIDE

    system_instructions = _build_system_instructions(base_instructions, CUSTOM_TOOLS_ENABLED)

    safe_id = institute_id.replace("-", "_")
    institute_agent = Agent(
        name=f"smartedx_voice_agent_{safe_id}",
        model=DEMO_AGENT_MODEL,
        tools=_shared_tools,
        instruction=system_instructions,
    )

    institute_runner = Runner(
        app_name=APP_NAME,
        agent=institute_agent,
        session_service=session_service,
    )

    with _cache_lock:
        # Double-checked locking: another thread may have populated during fetch
        if institute_id not in _institute_cache:
            _institute_cache[institute_id] = (institute_runner, "")
        return _institute_cache[institute_id]


# ── Per-course Q&A agent cache ────────────────────────────────────────
# Students select a course and ask questions; the agent searches only that
# course's indexed content via the course_kb Qdrant collection.

_course_qa_cache: dict[str, tuple[Runner, str]] = {}  # "{institute_id}:{course_id}" -> (runner, greeting)
_course_qa_lock = threading.Lock()


def get_runner_for_course(
    institute_id: str,
    course_id: str,
    course_name: str,
    session_service: InMemorySessionService,
) -> tuple[Runner, str]:
    """Return a cached (Runner, greeting) for a course Q&A voice assistant.

    The agent is scoped to a single course — its ``search_course_material``
    tool automatically filters Qdrant results to the given ``course_id``.

    Args:
        institute_id: Institute UUID (namespaces the cache key).
        course_id:    Course UUID (Qdrant filter + cache key).
        course_name:  Human-readable course name used in the system prompt.
        session_service: Shared ADK session service instance.

    Returns:
        (runner, greeting_message) — greeting is sent to the student on connect.
    """
    cache_key = f"{institute_id}:{course_id}"

    with _course_qa_lock:
        if cache_key in _course_qa_cache:
            return _course_qa_cache[cache_key]

    if not COURSE_KB_ENABLED:
        logger.warning("Course KB is disabled (COURSE_KB_ENABLED=false) — course Q&A agent will have no search tool")

    logger.info(f"Building course Q&A agent for course: {course_name!r} ({course_id})")

    # Build a course-specific search tool via closure so course_id is baked in.
    def search_course_material(query: str, limit: int = 5) -> dict:
        """Search the course material for information relevant to the student's question.

        Use this tool whenever the student asks about any topic, concept, or
        content covered in this course.  Always search before answering to
        ensure accuracy.

        Args:
            query: Natural-language description of the information to find.
            limit: Maximum number of results to return (default 5).

        Returns:
            Matching excerpts from the course material with page references.
        """
        if not COURSE_KB_ENABLED:
            return {"status": "error", "message": "Course knowledge base is not enabled."}
        try:
            from app.qdrant.course_kb import search_course

            results = search_course(institute_id=institute_id, course_id=course_id, query=query, limit=limit)
            if not results:
                return {"status": "no_results", "message": "No relevant information found in the course material."}
            return {"status": "ok", "results": results}
        except Exception as e:
            logger.error(f"Course KB search failed for course {course_id}: {e}", exc_info=True)
            return {"status": "error", "message": "Failed to search course material."}

    system_instructions = all_instructions + (
        f"You are an AI tutor for the course '{course_name}'.\n"
        f"Your role is to help students understand the course material and answer their questions.\n"
        f"- Use the search_course_material tool to look up relevant information before answering.\n"
        f"- Give clear, concise, and helpful explanations based on the retrieved content.\n"
        f"- Cite the page number when referencing specific material (e.g. 'According to page 3...').\n"
        f"- If the answer is not in the course material, say so honestly and suggest the student\n"
        f"  consult their teacher or course notes.\n"
        f"- Be encouraging and supportive — you are a tutor, not just a search engine.\n"
        f"\nCOURSE MATERIAL SEARCH: ALWAYS call search_course_material before answering any question\n"
        f"about the course content. Do not answer from memory alone."
    )

    safe_id = course_id.replace("-", "_")
    course_agent = Agent(
        name=f"smartedx_course_qa_{safe_id}",
        model=DEMO_AGENT_MODEL,
        tools=[
            FunctionTool(func=search_course_material),
            FunctionTool(func=end_call),
        ],
        instruction=system_instructions,
    )

    course_runner = Runner(
        app_name=APP_NAME,
        agent=course_agent,
        session_service=session_service,
    )

    greeting = f"Hello! I'm your AI tutor for {course_name}. What would you like to learn about today?"

    with _course_qa_lock:
        if cache_key not in _course_qa_cache:
            _course_qa_cache[cache_key] = (course_runner, greeting)
    return _course_qa_cache[cache_key]


# ── Per-teacher agent cache ───────────────────────────────────────────────────
# Teachers get a voice agent that can search across course materials in Qdrant.

_teacher_cache: dict[str, tuple[Runner, str]] = {}  # "{institute_id}:{teacher_id}" -> (runner, greeting)
_teacher_lock = threading.Lock()


def get_runner_for_teacher(
    institute_id: str,
    teacher_id: str,
    session_service: InMemorySessionService,
) -> tuple[Runner, str]:
    """Return a cached (Runner, greeting) for the teacher voice assistant.

    The agent can search course materials indexed in Qdrant for any course
    that belongs to the institute, making it useful for lesson planning,
    curriculum questions, and content queries.
    """
    cache_key = f"{institute_id}:{teacher_id}"

    with _teacher_lock:
        if cache_key in _teacher_cache:
            return _teacher_cache[cache_key]

    logger.info(f"Building teacher agent for institute={institute_id} teacher={teacher_id}")

    def search_course_material(query: str, course_id: str = "", limit: int = 5) -> dict:
        """Search course materials stored in Qdrant.

        Use this tool whenever the teacher asks about course content, lesson topics,
        or any information that may be in the course materials.

        Args:
            query:     Natural-language description of the information to find.
            course_id: Optional specific course UUID to narrow the search.
                       Leave empty to search across all indexed courses.
            limit:     Maximum number of results to return (default 5).

        Returns:
            Matching excerpts from course materials with page references.
        """
        if not COURSE_KB_ENABLED:
            return {"status": "error", "message": "Course knowledge base is not enabled."}
        try:
            from app.qdrant.course_kb import search_course

            if course_id:
                results = search_course(
                    institute_id=institute_id,
                    course_id=course_id,
                    query=query,
                    limit=limit,
                )
            else:
                # No course_id supplied — search the general institute KB if available
                if QDRANT_KB_ENABLED and _embedding_model is not None:
                    return search_knowledgebase(query=query, limit=limit)
                return {"status": "error", "message": "Please provide a course_id to search course materials."}

            if not results:
                return {"status": "no_results", "message": "No relevant information found in the course material."}
            return {"status": "ok", "results": results}
        except Exception as e:
            logger.error(f"Teacher course KB search failed: {e}", exc_info=True)
            return {"status": "error", "message": "Failed to search course material."}

    system_instructions = all_instructions + (
        "You are an AI voice assistant for teachers at SmartEdX.\n"
        "Your role is to help teachers with course content, lesson planning, and curriculum questions.\n"
        "- Use the search_course_material tool to look up information from course materials in Qdrant.\n"
        "- When searching, provide a course_id if the teacher mentions a specific course.\n"
        "- Give clear, concise answers based on the retrieved content.\n"
        "- Cite page numbers when referencing specific material.\n"
        "- If the answer is not in the course material, say so honestly.\n"
        "- Be professional, supportive, and focused on helping the teacher.\n"
        "\nCOURSE MATERIAL SEARCH: Use search_course_material before answering questions about course content."
    )

    safe_id = teacher_id.replace("-", "_")
    teacher_agent = Agent(
        name=f"smartedx_teacher_agent_{safe_id}",
        model=DEMO_AGENT_MODEL,
        tools=[
            FunctionTool(func=search_course_material),
            FunctionTool(func=end_call),
        ],
        instruction=system_instructions,
    )

    teacher_runner = Runner(
        app_name=APP_NAME,
        agent=teacher_agent,
        session_service=session_service,
    )

    greeting = "Hello! I'm your AI teaching assistant. I can search your course materials and help with lesson planning. What would you like to know?"

    with _teacher_lock:
        if cache_key not in _teacher_cache:
            _teacher_cache[cache_key] = (teacher_runner, greeting)
    return _teacher_cache[cache_key]


__all__ = [
    "get_runner_for_course",
    "get_runner_for_institute",
    "get_runner_for_teacher",
    "register_call_guard",
    "search_knowledgebase",
    "unregister_call_guard",
    "update_call_guard",
]
