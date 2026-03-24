"""Institute owner AI assistant — live tool calling against the institute service."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx
from agno.agent import Agent

from config import settings


# ─── Action tracker (shared mutable state between tools and the router) ───────


@dataclass
class ActionTracker:
    """Collects side-effects produced by tools so the router can relay them to the UI."""
    created_courses: list[dict] = field(default_factory=list)


# ─── Live tool factory (closures capture institute_id + auth_token) ───────────


def _make_live_tools(
    institute_id: str,
    auth_token: str | None,
    tracker: ActionTracker,
):
    """
    Return tool functions that call the institute API with the owner's auth token.
    Closures let us keep Agno's simple function-tool interface without extra params.
    """
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

    def _post(path: str, payload: dict) -> Any:
        url = f"{api_base}{path}"
        with httpx.Client(timeout=15) as client:
            r = client.post(url, headers=_headers(), json=payload)
            r.raise_for_status()
            return r.json()

    # ── Tool: get live analytics ───────────────────────────────────────────

    def get_institute_analytics() -> str:
        """
        Fetch live analytics from the institute: student list, teacher list,
        and full course catalogue. Returns a detailed breakdown.
        """
        try:
            students = _get(f"/api/institutes/institutes/{institute_id}/users?role=student")
            teachers = _get(f"/api/institutes/institutes/{institute_id}/users?role=teacher")
            courses  = _get(f"/api/institutes/institutes/{institute_id}/courses")

            active_students   = [s for s in students if s.get("isActive", True)]
            inactive_students = len(students) - len(active_students)
            ratio = len(students) / max(len(teachers), 1)

            # Per-course summary (cap at 15 to stay within context)
            course_lines: list[str] = []
            for c in courses[:15]:
                modules   = len(c.get("modules", []))
                t         = c.get("assignedTeacher")
                tname     = (
                    f"{t.get('firstName','')} {t.get('lastName','')}".strip()
                    if t else "Unassigned"
                )
                course_lines.append(
                    f"  • {c.get('name','?')} "
                    f"[{c.get('code','?')}] "
                    f"Batch {c.get('batchNumber','?')} | "
                    f"{modules} module(s) | Teacher: {tname}"
                )

            # Batch distribution
            batches: dict[str, int] = {}
            for c in courses:
                b = c.get("batchNumber", "Unknown")
                batches[b] = batches.get(b, 0) + 1
            batch_lines = [f"  • Batch {b}: {n} course(s)" for b, n in sorted(batches.items())]

            lines = [
                "📊 LIVE INSTITUTE ANALYTICS",
                "─" * 42,
                f"👥 Students : {len(students)} total  |  {len(active_students)} active  |  {inactive_students} inactive",
                f"🎓 Teachers : {len(teachers)}",
                f"📚 Courses  : {len(courses)}",
                f"⚖️  Student-Teacher Ratio: {ratio:.1f}:1",
                "",
                "COURSE BREAKDOWN:",
                *(course_lines if course_lines else ["  No courses yet"]),
                "",
                "BATCH DISTRIBUTION:",
                *(batch_lines if batch_lines else ["  No batches yet"]),
            ]
            return "\n".join(lines)

        except httpx.HTTPStatusError as exc:
            return f"Analytics fetch failed (HTTP {exc.response.status_code}): {exc.response.text}"
        except Exception as exc:
            return f"Analytics fetch error: {exc}"

    # ── Tool: create course ────────────────────────────────────────────────

    def create_course(
        name: str,
        code: str,
        description: str,
        batch_number: str,
    ) -> str:
        """
        Create a new course in the institute system.
        Requires: name (string), code (short identifier e.g. 'CS101'),
        description (string), batch_number (e.g. 'Batch 1' or '2024-A').
        """
        try:
            payload = {
                "name": name,
                "code": code,
                "description": description,
                "batchNumber": batch_number,
            }
            course = _post(
                f"/api/institutes/institutes/{institute_id}/courses",
                payload,
            )
            tracker.created_courses.append(course)
            return (
                f"✅ Course created successfully!\n"
                f"  Name   : {course.get('name')}\n"
                f"  Code   : {course.get('code')}\n"
                f"  Batch  : {course.get('batchNumber')}\n"
                f"  ID     : {course.get('id')}"
            )
        except httpx.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get("message", exc.response.text)
            except Exception:
                detail = exc.response.text
            return f"Failed to create course (HTTP {exc.response.status_code}): {detail}"
        except Exception as exc:
            return f"Course creation error: {exc}"

    # ── Tool: list courses ─────────────────────────────────────────────────

    def list_courses() -> str:
        """List all courses in the institute with their details."""
        try:
            courses = _get(f"/api/institutes/institutes/{institute_id}/courses")
            if not courses:
                return "No courses found in the institute."

            lines = [f"📚 COURSES ({len(courses)} total)", "─" * 40]
            for c in courses:
                t = c.get("assignedTeacher")
                tname = (
                    f"{t.get('firstName','')} {t.get('lastName','')}".strip()
                    if t else "Unassigned"
                )
                lines.append(
                    f"• {c.get('name')} [{c.get('code')}]\n"
                    f"  Batch: {c.get('batchNumber')} | "
                    f"Modules: {len(c.get('modules',[]))} | "
                    f"Teacher: {tname}"
                )
            return "\n".join(lines)
        except Exception as exc:
            return f"Failed to fetch courses: {exc}"

    return get_institute_analytics, create_course, list_courses


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


def _build_assistant(
    institute_context: dict,
    institute_id: str,
    auth_token: str | None,
    tracker: ActionTracker,
) -> Agent:
    ctx = institute_context or {}
    name = ctx.get("institute_name", "your institute")

    context_note = (
        f"\n\nSession context (may be stale — use get_institute_analytics for live data):\n"
        f"  Institute : {name}\n"
        f"  Students  : {ctx.get('student_count', 'unknown')}\n"
        f"  Teachers  : {ctx.get('teacher_count', 'unknown')}\n"
        f"  Courses   : {ctx.get('course_count', 'unknown')}"
    )

    get_analytics, create_course_tool, list_courses_tool = _make_live_tools(
        institute_id, auth_token, tracker
    )

    return Agent(
        model=_make_model(),
        description=(
            "You are an intelligent AI assistant exclusively for the owner of a SmartEdX educational institute. "
            "You help manage and grow the institute by fetching live analytics, creating courses, "
            "drafting communications, and providing strategic insights. "
            "Always be professional, concise, and action-oriented."
            + context_note
        ),
        instructions=[
            # ── Live tool calls (use tools ONLY for these) ──
            "Call get_institute_analytics when asked about metrics, performance, students, teachers, or course stats.",
            "Call list_courses when the owner wants to see their current courses.",
            "Call create_course when the owner wants to create a course. You MUST collect all 4 fields first: "
            "name, code (short identifier like 'CS101'), description, and batch_number. "
            "If any field is missing, ask for it before calling the tool.",
            # ── Generate directly — NO tool call needed ──
            "For report templates, announcements, course outlines, and general advice: "
            "respond directly with well-formatted text. Do NOT call any tool for these.",
            "When writing a report template use clear sections: Enrollment Summary, Academic Highlights, "
            "Staff & Operations, Next Period Goals. Include emoji headers and fill-in placeholders.",
            "When drafting an announcement use: header, greeting, body, key points, sign-off.",
            "When building a course outline use 4 modules with week ranges and bullet points.",
            # ── General ──
            "After every tool call summarise the result clearly and friendly.",
            "Never expose raw JSON or internal IDs — summarise naturally.",
            "If a live API call fails, explain what happened and suggest next steps.",
        ],
        tools=[
            get_analytics,
            create_course_tool,
            list_courses_tool,
        ],
        show_tool_calls=False,
    )


# ─── Public API ────────────────────────────────────────────────────────────────


async def chat_with_assistant(
    messages: list[dict],
    institute_context: dict,
    institute_id: str,
    auth_token: str | None,
    tracker: ActionTracker,
) -> str:
    """
    Run the institute assistant with conversation history and live tool access.

    Returns the assistant's reply string.
    Side-effects (created courses, etc.) are recorded in `tracker`.
    """
    agent = _build_assistant(institute_context, institute_id, auth_token, tracker)

    last_user_message = messages[-1]["content"] if messages else ""

    prior_turns: list[str] = []
    for msg in messages[:-1]:
        label = "Owner" if msg["role"] == "user" else "Assistant"
        prior_turns.append(f"{label}: {msg['content']}")

    if prior_turns:
        prompt = (
            "Conversation history:\n"
            + "\n".join(prior_turns)
            + "\n\nOwner (current message): "
            + last_user_message
        )
    else:
        prompt = last_user_message

    result = await agent.arun(prompt)
    return result.content if isinstance(result.content, str) else str(result.content)
