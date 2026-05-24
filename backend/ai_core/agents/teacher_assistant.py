"""Teacher AI assistant — live tool calling against the institute service."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx
from agno.agent import Agent

from agents.retry import run_with_retry
from config import settings

logger = logging.getLogger(__name__)


def _fetch_teacher_agent_instructions(institute_id: str, course_id: str) -> str | None:
    """Fetch teacherAgentInstructions for a course from the institute service.

    Returns the custom instructions string, or None if not set / on error.
    """
    try:
        url = f"{settings.INSTITUTE_API_URL.rstrip('/')}/api/institutes/institutes/{institute_id}/courses/{course_id}/agent-config"
        with httpx.Client(timeout=5) as client:
            r = client.get(url)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json().get("teacherAgentInstructions") or None
    except Exception as exc:
        logger.warning(f"Failed to fetch teacher agent instructions for course {course_id}: {exc}")
        return None


# ─── Action tracker ───────────────────────────────────────────────────────────


@dataclass
class TeacherActionTracker:
    """Collects side-effects produced by tools so the router can relay them to the UI."""
    generated_content: list[dict] = field(default_factory=list)


# ─── Live tool factory ────────────────────────────────────────────────────────


def _make_teacher_tools(
    institute_id: str,
    teacher_id: str,
    auth_token: str | None,
    tracker: TeacherActionTracker,
):
    """Return tool functions that call the institute API with the teacher's auth token."""
    api_base = settings.INSTITUTE_API_URL.rstrip("/")

    def _headers() -> dict[str, str]:
        h: dict[str, str] = {"Content-Type": "application/json"}
        if auth_token:
            h["Authorization"] = f"Bearer {auth_token}"
        return h

    def _get(path: str) -> Any:
        url = f"{api_base}{path}"
        with httpx.Client(timeout=15) as client:
            r = client.get(url, headers=_headers())
            r.raise_for_status()
            return r.json()

    # ── Tool: get my courses ───────────────────────────────────────────────

    def get_my_courses() -> str:
        """
        Fetch all courses assigned to this teacher in the institute.
        Returns course name, code, batch number, and module count.
        """
        try:
            courses = _get(f"/api/institutes/institutes/{institute_id}/courses")
            my_courses = [
                c for c in courses
                if c.get("assignedTeacher", {}) and c.get("assignedTeacher", {}).get("id") == teacher_id
            ]
            if not my_courses:
                return "You have no courses assigned to you in this institute yet."

            lines = [f"📚 YOUR COURSES ({len(my_courses)} total)", "─" * 40]
            for c in my_courses:
                modules = len(c.get("modules", []))
                lines.append(
                    f"• {c.get('name')} [{c.get('code')}]\n"
                    f"  Batch: {c.get('batchNumber')} | Modules: {modules}\n"
                    f"  Description: {c.get('description', 'No description')[:100]}"
                )
            return "\n".join(lines)
        except httpx.HTTPStatusError as exc:
            return f"Failed to fetch courses (HTTP {exc.response.status_code}): {exc.response.text}"
        except Exception as exc:
            return f"Error fetching courses: {exc}"

    # ── Tool: get my students ─────────────────────────────────────────────

    def get_my_students() -> str:
        """
        Fetch all students in the institute that this teacher manages.
        Returns student names, emails, and active status.
        """
        try:
            students = _get(f"/api/institutes/institutes/{institute_id}/users?role=student")
            if not students:
                return "No students found in this institute."

            active = [s for s in students if s.get("isActive", True)]
            inactive = len(students) - len(active)

            lines = [
                f"👥 STUDENTS ({len(students)} total | {len(active)} active | {inactive} inactive)",
                "─" * 40,
            ]
            for s in students[:30]:  # cap at 30
                status = "✅ Active" if s.get("isActive", True) else "⏸ Inactive"
                name = f"{s.get('firstName', '')} {s.get('lastName', '')}".strip()
                lines.append(f"• {name} — {s.get('email', 'N/A')} [{status}]")

            if len(students) > 30:
                lines.append(f"  ... and {len(students) - 30} more students")
            return "\n".join(lines)
        except httpx.HTTPStatusError as exc:
            return f"Failed to fetch students (HTTP {exc.response.status_code}): {exc.response.text}"
        except Exception as exc:
            return f"Error fetching students: {exc}"

    # ── Tool: find student by name ─────────────────────────────────────────

    def find_student(name_query: str) -> str:
        """
        Search for a specific student by name (partial match supported).
        Use this when the teacher asks about a specific student.
        Args:
            name_query: The student's name or partial name to search for.
        """
        try:
            students = _get(f"/api/institutes/institutes/{institute_id}/users?role=student")
            query = name_query.lower().strip()
            matches = [
                s for s in students
                if query in f"{s.get('firstName', '')} {s.get('lastName', '')}".lower()
                or query in s.get("email", "").lower()
            ]
            if not matches:
                return f"No student found matching '{name_query}'."

            lines = [f"🔍 Students matching '{name_query}':", "─" * 40]
            for s in matches:
                name = f"{s.get('firstName', '')} {s.get('lastName', '')}".strip()
                status = "Active" if s.get("isActive", True) else "Inactive"
                lines.append(
                    f"• {name}\n"
                    f"  Email: {s.get('email', 'N/A')}\n"
                    f"  Status: {status}\n"
                    f"  ID: {s.get('id', 'N/A')}"
                )
            return "\n".join(lines)
        except Exception as exc:
            return f"Error searching for student: {exc}"

    # ── Tool: get course details ───────────────────────────────────────────

    def get_course_details(course_name_or_code: str) -> str:
        """
        Get detailed information about a specific course by its name or code.
        Args:
            course_name_or_code: The course name or code to look up.
        """
        try:
            courses = _get(f"/api/institutes/institutes/{institute_id}/courses")
            query = course_name_or_code.lower().strip()
            matches = [
                c for c in courses
                if query in c.get("name", "").lower()
                or query in c.get("code", "").lower()
            ]
            if not matches:
                return f"No course found matching '{course_name_or_code}'."

            lines = []
            for c in matches[:3]:
                modules = c.get("modules", [])
                t = c.get("assignedTeacher")
                tname = (
                    f"{t.get('firstName', '')} {t.get('lastName', '')}".strip()
                    if t else "Unassigned"
                )
                lines.append(
                    f"📖 {c.get('name')} [{c.get('code')}]"
                    f"\n  Batch: {c.get('batchNumber')}"
                    f"\n  Teacher: {tname}"
                    f"\n  Description: {c.get('description', 'No description')}"
                    f"\n  Modules ({len(modules)}):"
                )
                for m in modules:
                    lines.append(f"    • {m.get('title', 'Untitled')} (Order: {m.get('order', '?')})")
            return "\n".join(lines)
        except Exception as exc:
            return f"Error fetching course details: {exc}"

    # ── Tool: get students enrolled in a specific course ──────────────────────

    def get_course_students(course_name_or_code: str) -> str:
        """
        Get the list of students enrolled in a specific course.
        Use this when the teacher asks how many students are in a course or who is enrolled.
        Args:
            course_name_or_code: Course name or code (e.g. 'CS101', 'Python Basics').
        """
        try:
            courses = _get(f"/api/institutes/institutes/{institute_id}/courses")
            query = course_name_or_code.lower().strip()
            matches = [
                c for c in courses
                if query in c.get("name", "").lower()
                or query in c.get("code", "").lower()
            ]
            if not matches:
                return f"No course found matching '{course_name_or_code}'."

            c = matches[0]
            # Check for embedded students/enrolledStudents in the course object
            students = c.get("students") or c.get("enrolledStudents") or []
            if students:
                lines = [
                    f"👥 {c.get('name')} [{c.get('code')}] — {len(students)} student(s) enrolled",
                    "─" * 40,
                ]
                for s in students[:30]:
                    name = f"{s.get('firstName', '')} {s.get('lastName', '')}".strip()
                    lines.append(f"• {name} — {s.get('email', 'N/A')}")
                if len(students) > 30:
                    lines.append(f"  ... and {len(students) - 30} more")
                return "\n".join(lines)

            # No per-course enrollment data in the course object — show institute total
            student_count = c.get("studentCount") or c.get("enrolledCount")
            if student_count is not None:
                return f"{c.get('name')} [{c.get('code')}] has {student_count} student(s) enrolled."

            return (
                f"{c.get('name')} [{c.get('code')}]\n"
                f"Per-course enrollment details are not available via the API. "
                f"Use 'get_my_students' to see all students in this institute."
            )
        except Exception as exc:
            return f"Error fetching course students: {exc}"

    return get_my_courses, get_my_students, find_student, get_course_details, get_course_students


# ─── Course KB search tool ────────────────────────────────────────────────────


def _make_course_search_tool(institute_id: str, course_id: str):
    """Return a search_course_material tool scoped to a specific course.

    Searches Qdrant directly — same collection and embedding model used by the
    voice agent, so both agents read the same indexed course documents.
    """
    from utils.qdrant_search import search_course_kb

    def search_course_material(query: str) -> str:
        """Search the course's uploaded documents and materials for relevant content.
        Call this for ANY question about course topics, lecture content, concepts, or uploaded files.
        Args:
            query: Specific topic or keyword from the teacher's question, e.g. 'recursion', 'photosynthesis'.
                   Never use generic phrases like 'course content' or 'lecture material'.
        """
        results = search_course_kb(institute_id, course_id, query, limit=3)
        if not results:
            return f"No material found for '{query}' in the course documents."
        parts = []
        for res in results:
            page = res.get("page")
            content = res.get("content", "")
            title = res.get("title", "")
            page_str = f" (Page {page})" if page else ""
            title_str = f"[{title}] " if title else ""
            parts.append(f"{title_str}{content}{page_str}")
        return "\n\n".join(parts)

    return search_course_material


# ─── Model factory ────────────────────────────────────────────────────────────


def _make_model():
    if settings.AI_PROVIDER == "openai":
        from agno.models.openai import OpenAIChat
        return OpenAIChat(id=settings.MODEL_ID, api_key=settings.OPENAI_API_KEY)
    if settings.AI_PROVIDER == "gemini":
        from agno.models.google import Gemini
        return Gemini(id=settings.MODEL_ID, api_key=settings.GOOGLE_API_KEY)
    from agno.models.anthropic import Claude
    return Claude(id=settings.MODEL_ID, api_key=settings.ANTHROPIC_API_KEY)


# ─── Agent factory ────────────────────────────────────────────────────────────


def _build_teacher_assistant(
    teacher_context: dict,
    institute_id: str,
    teacher_id: str,
    auth_token: str | None,
    tracker: TeacherActionTracker,
    file_content: str | None = None,
    custom_instructions: str | None = None,
    course_id: str | None = None,
) -> Agent:
    ctx = teacher_context or {}
    teacher_name = ctx.get("teacher_name", "Teacher")
    institute_name = ctx.get("institute_name", "your institute")

    context_note = (
        f"\n\nSession context:"
        f"\n  Teacher: {teacher_name}"
        f"\n  Institute: {institute_name}"
        f"\n  Your courses: {ctx.get('course_count', 'unknown')}"
        f"\n  Total students: {ctx.get('student_count', 'unknown')}"
    )

    file_note = ""
    if file_content:
        preview = file_content[:2000]
        file_note = (
            f"\n\nUPLOADED FILE CONTENT (first 2000 chars):\n"
            f"{'─' * 40}\n{preview}\n{'─' * 40}\n"
            "The teacher has uploaded a file. Use its content to answer their question."
        )

    get_courses, get_students, find_student, get_course_details, get_course_students = _make_teacher_tools(
        institute_id, teacher_id, auth_token, tracker
    )

    course_id_ctx = course_id or ctx.get("course_id") or None
    all_tools: list = [get_courses, get_students, find_student, get_course_details, get_course_students]
    course_search_hint = ""
    if course_id_ctx:
        all_tools.append(_make_course_search_tool(institute_id, str(course_id_ctx)))
        course_search_hint = (
            "Call search_course_material for ANY question about course topics, lecture content, "
            "uploaded documents, or what was covered in a lecture — use the specific subject as the query, "
            "never a generic phrase like 'course content'."
        )

    _tool_call_instructions = [
        "Call get_my_courses when the teacher asks about their courses, teaching load, or assigned classes.",
        "Call get_my_students when the teacher asks about their students, class roster, or attendance overview.",
        "Call find_student when the teacher asks about a SPECIFIC student by name.",
        "Call get_course_details when the teacher asks for detailed info about a specific course.",
        "Call get_course_students when the teacher asks how many students are enrolled in a course or who is in a course.",
        "Never expose raw JSON or internal IDs — summarize naturally.",
    ]
    if course_search_hint:
        _tool_call_instructions.insert(0, course_search_hint)

    if custom_instructions:
        base_description = custom_instructions
        instructions = _tool_call_instructions
    else:
        base_description = (
            "You are an intelligent AI assistant for a SmartEdX teacher. "
            "You help teachers manage their students, plan lessons, generate educational content, "
            "analyze student data, and answer questions about their courses and students. "
            "Always be supportive, professional, and focused on improving educational outcomes."
        )
        instructions = _tool_call_instructions + [
            "For lesson plans: generate a detailed plan with objectives, activities, materials, and assessments. "
            "Structure it with clear sections and time estimates.",
            "For quiz/assessment generation: create well-formatted questions with answer keys. "
            "Include multiple choice, short answer, and essay questions as appropriate.",
            "For student feedback: provide constructive, encouraging feedback templates.",
            "For announcements/emails: write professional, clear communications.",
            "For uploaded files: analyze the content and answer questions based on it directly.",
            "After every tool call, summarize the result clearly and offer helpful next steps.",
            "Be encouraging and supportive — teachers have a demanding job.",
            "If asked to generate educational content, make it immediately usable in a classroom.",
        ]

    return Agent(
        model=_make_model(),
        description=(base_description + context_note + file_note),
        instructions=instructions,
        tools=all_tools,
        show_tool_calls=False,
    )


# ─── Public API ───────────────────────────────────────────────────────────────


async def chat_with_teacher_assistant(
    messages: list[dict],
    teacher_context: dict,
    institute_id: str,
    teacher_id: str,
    auth_token: str | None,
    tracker: TeacherActionTracker,
    file_content: str | None = None,
    course_id: str | None = None,
) -> str:
    """
    Run the teacher assistant with conversation history and live tool access.
    Returns the assistant's reply string.
    """
    custom_instructions: str | None = None
    if course_id:
        custom_instructions = _fetch_teacher_agent_instructions(institute_id, course_id)

    last_user_message = messages[-1]["content"] if messages else ""

    prior_turns: list[str] = []
    for msg in messages[:-1]:
        label = "Teacher" if msg["role"] == "user" else "Assistant"
        prior_turns.append(f"{label}: {msg['content']}")

    prompt = (
        "Conversation history:\n" + "\n".join(prior_turns) + "\n\nTeacher (current message): " + last_user_message
        if prior_turns else last_user_message
    )

    async def _run() -> str:
        agent = _build_teacher_assistant(
            teacher_context, institute_id, teacher_id, auth_token, tracker, file_content, custom_instructions, course_id
        )
        result = await agent.arun(prompt)
        return result.content if isinstance(result.content, str) else str(result.content)

    return await run_with_retry(_run, label="teacher_assistant")
