"""Student AI assistant — learning guide with live course tool calling."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx
from agno.agent import Agent

from config import settings


# ─── Action tracker ───────────────────────────────────────────────────────────


@dataclass
class StudentActionTracker:
    """Collects side-effects produced by tools."""
    study_plans: list[dict] = field(default_factory=list)


# ─── Live tool factory ────────────────────────────────────────────────────────


def _make_student_tools(
    institute_id: str,
    student_id: str,
    auth_token: str | None,
):
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

    # ── Tool: list all courses ─────────────────────────────────────────────

    def get_my_courses() -> str:
        """
        Fetch all courses available in this institute.
        Use this to show the student what courses they are enrolled in.
        """
        try:
            courses = _get(f"/api/institutes/institutes/{institute_id}/courses")
            if not courses:
                return "No courses found in this institute."

            lines = [f"📚 AVAILABLE COURSES ({len(courses)} total)", "─" * 42]
            for c in courses:
                t = c.get("assignedTeacher")
                tname = (
                    f"{t.get('firstName', '')} {t.get('lastName', '')}".strip()
                    if t else "No teacher assigned"
                )
                modules = len(c.get("modules", []))
                lines.append(
                    f"• {c.get('name')} [{c.get('code')}]\n"
                    f"  Batch: {c.get('batchNumber')} | Modules: {modules} | Teacher: {tname}\n"
                    f"  {c.get('description', '')[:100]}"
                )
            return "\n".join(lines)
        except httpx.HTTPStatusError as exc:
            return f"Failed to fetch courses (HTTP {exc.response.status_code}): {exc.response.text}"
        except Exception as exc:
            return f"Error fetching courses: {exc}"

    # ── Tool: get course details & modules ─────────────────────────────────

    def get_course_details(course_name_or_code: str) -> str:
        """
        Get the full details and module list of a specific course.
        Call this when the student asks about what is covered in a course.
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
            modules = c.get("modules", [])
            t = c.get("assignedTeacher")
            tname = (
                f"{t.get('firstName', '')} {t.get('lastName', '')}".strip()
                if t else "No teacher assigned"
            )

            lines = [
                f"📖 {c.get('name')} [{c.get('code')}]",
                f"   Batch: {c.get('batchNumber')} | Teacher: {tname}",
                f"   {c.get('description', 'No description provided.')}",
                "",
                f"   Modules ({len(modules)}):",
            ]
            for m in sorted(modules, key=lambda x: x.get("order", 0)):
                desc = m.get("description", "")
                lines.append(
                    f"   {m.get('order', '?')}. {m.get('title', 'Untitled')}"
                    + (f" — {desc[:80]}" if desc else "")
                )
            if not modules:
                lines.append("   No modules added yet.")
            return "\n".join(lines)
        except Exception as exc:
            return f"Error fetching course details: {exc}"

    # ── Tool: get my teacher info ──────────────────────────────────────────

    def get_my_teachers() -> str:
        """
        List all teachers in this institute and which courses they teach.
        Use this when the student asks about who their teachers are.
        """
        try:
            courses = _get(f"/api/institutes/institutes/{institute_id}/courses")
            teacher_map: dict[str, dict] = {}
            for c in courses:
                t = c.get("assignedTeacher")
                if t and t.get("id"):
                    tid = t["id"]
                    if tid not in teacher_map:
                        teacher_map[tid] = {
                            "name": f"{t.get('firstName', '')} {t.get('lastName', '')}".strip(),
                            "email": t.get("email", "N/A"),
                            "courses": [],
                        }
                    teacher_map[tid]["courses"].append(c.get("name", "Unknown"))

            if not teacher_map:
                return "No teachers found in this institute."

            lines = [f"🎓 TEACHERS ({len(teacher_map)} total)", "─" * 40]
            for info in teacher_map.values():
                lines.append(
                    f"• {info['name']} — {info['email']}\n"
                    f"  Teaches: {', '.join(info['courses'])}"
                )
            return "\n".join(lines)
        except Exception as exc:
            return f"Error fetching teacher info: {exc}"

    # ── Tool: search course content ────────────────────────────────────────

    def search_courses(topic: str) -> str:
        """
        Search for courses or modules related to a topic the student wants to learn.
        Args:
            topic: The subject or topic to search for (e.g. 'machine learning', 'algebra').
        """
        try:
            courses = _get(f"/api/institutes/institutes/{institute_id}/courses")
            topic_lower = topic.lower()
            results: list[str] = []

            for c in courses:
                course_match = (
                    topic_lower in c.get("name", "").lower()
                    or topic_lower in c.get("description", "").lower()
                    or topic_lower in c.get("code", "").lower()
                )
                matching_modules = [
                    m for m in c.get("modules", [])
                    if topic_lower in m.get("title", "").lower()
                    or topic_lower in m.get("description", "").lower()
                ]

                if course_match or matching_modules:
                    t = c.get("assignedTeacher")
                    tname = (
                        f"{t.get('firstName', '')} {t.get('lastName', '')}".strip()
                        if t else "No teacher"
                    )
                    entry = [f"📘 {c.get('name')} [{c.get('code')}] — Teacher: {tname}"]
                    for m in matching_modules:
                        entry.append(f"   └ Module: {m.get('title', 'Untitled')}")
                    results.append("\n".join(entry))

            if not results:
                return (
                    f"No courses or modules found for '{topic}'.\n"
                    "I can still help you learn this topic — just ask me to explain it!"
                )
            header = [f"🔍 Results for '{topic}':", "─" * 40]
            return "\n".join(header + results)
        except Exception as exc:
            return f"Error searching courses: {exc}"

    return get_my_courses, get_course_details, get_my_teachers, search_courses


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


def _build_student_assistant(
    student_context: dict,
    institute_id: str,
    student_id: str,
    auth_token: str | None,
    file_content: str | None = None,
) -> Agent:
    ctx = student_context or {}
    student_name = ctx.get("student_name", "Student")
    institute_name = ctx.get("institute_name", "your institute")

    context_note = (
        f"\n\nSession context:"
        f"\n  Student: {student_name}"
        f"\n  Institute: {institute_name}"
        f"\n  Enrolled courses: {ctx.get('course_count', 'unknown')}"
    )

    file_note = ""
    if file_content:
        preview = file_content[:3000]
        file_note = (
            f"\n\nUPLOADED DOCUMENT (first 3000 chars):\n"
            f"{'─' * 40}\n{preview}\n{'─' * 40}\n"
            "The student uploaded a document. Analyse it and answer their question based on its content."
        )

    get_courses, get_course_details, get_teachers, search_courses = _make_student_tools(
        institute_id, student_id, auth_token
    )

    return Agent(
        model=_make_model(),
        description=(
            "You are a friendly, encouraging AI learning companion for a SmartEdX student. "
            "Your mission is to help the student understand concepts, navigate their courses, "
            "resolve doubts, and guide them toward academic success. "
            "Always be patient, clear, and supportive — break down complex ideas into simple steps. "
            "Celebrate progress and keep the student motivated."
            + context_note
            + file_note
        ),
        instructions=[
            # ── Live tool calls ──
            "Call get_my_courses when the student asks what courses they have, their schedule, or what they're enrolled in.",
            "Call get_course_details when the student asks about a specific course's content, syllabus, or modules.",
            "Call get_my_teachers when the student asks who their teacher is or wants to contact their teacher.",
            "Call search_courses when the student wants to find courses or modules related to a topic.",
            # ── Direct generation — NO tool call ──
            "For concept explanations: use simple language, real-world analogies, and step-by-step breakdowns. "
            "Structure: 1) Simple definition, 2) Why it matters, 3) How it works, 4) Example.",
            "For study plans: create a realistic weekly plan with specific daily goals, review sessions, and practice tasks.",
            "For practice questions: generate varied question types (MCQ, short answer, problem-solving) with answers.",
            "For essay/writing help: give structure, key points to cover, and example sentences. Never write the full essay for them.",
            "For uploaded documents: summarise key points, identify main concepts, and answer specific questions about the content.",
            "For math/science problems: solve step-by-step, explain each step, and point out the underlying concept.",
            "For exam preparation: create a revision checklist, highlight key formulas/concepts, and suggest practice strategies.",
            # ── Behaviour ──
            "Always encourage the student — use phrases like 'Great question!', 'You're on the right track!', "
            "'Let's work through this together.'",
            "Never give direct answers to clearly assignment/exam questions — instead guide with hints and Socratic questions.",
            "After every tool call, explain the result clearly and suggest a useful next step for the student.",
            "If a topic is not in any course, still help — students may be learning independently.",
            "Keep explanations concise but complete. Use bullet points, numbered steps, and code blocks where appropriate.",
        ],
        tools=[get_courses, get_course_details, get_teachers, search_courses],
        show_tool_calls=False,
    )


# ─── Public API ───────────────────────────────────────────────────────────────


async def chat_with_student_assistant(
    messages: list[dict],
    student_context: dict,
    institute_id: str,
    student_id: str,
    auth_token: str | None,
    file_content: str | None = None,
) -> str:
    """
    Run the student assistant with conversation history and live tool access.
    Returns the assistant's reply string.
    """
    agent = _build_student_assistant(
        student_context, institute_id, student_id, auth_token, file_content
    )

    last_user_message = messages[-1]["content"] if messages else ""

    prior_turns: list[str] = []
    for msg in messages[:-1]:
        label = "Student" if msg["role"] == "user" else "Assistant"
        prior_turns.append(f"{label}: {msg['content']}")

    if prior_turns:
        prompt = (
            "Conversation history:\n"
            + "\n".join(prior_turns)
            + "\n\nStudent (current message): "
            + last_user_message
        )
    else:
        prompt = last_user_message

    result = await agent.arun(prompt)
    return result.content if isinstance(result.content, str) else str(result.content)
