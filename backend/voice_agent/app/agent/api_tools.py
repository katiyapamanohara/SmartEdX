"""Live institute API tools for the voice agent.

Creates Google ADK-compatible FunctionTool closures that call the SmartEdX
institute service to answer questions about courses, students, and teachers.
Responses are kept short and voice-friendly (no markdown, no emoji).
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from google.adk.tools import FunctionTool

from app.config import API_KEY, INSTITUTE_SERVICE_URL

logger = logging.getLogger(__name__)


def _api_get(path: str) -> Any:
    """Synchronous GET to the institute service. Raises on HTTP errors."""
    url = f"{INSTITUTE_SERVICE_URL.rstrip('/')}{path}"
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    with httpx.Client(timeout=8) as client:
        r = client.get(url, headers=headers)
        r.raise_for_status()
        return r.json()


# ── Student-facing tools ──────────────────────────────────────────────────────

def make_student_api_tools(institute_id: str) -> list[FunctionTool]:
    """Return live-data tools scoped to the given institute for student sessions."""

    def get_my_courses() -> str:
        """List all courses available in this institute.
        Call when the student asks what courses are available or what they are enrolled in.
        """
        try:
            courses = _api_get(f"/institutes/{institute_id}/courses")
            if not courses:
                return "There are no courses in this institute yet."
            names = [f"{c.get('name')} (code {c.get('code')})" for c in courses[:10]]
            return f"There are {len(courses)} course(s): {', '.join(names)}."
        except Exception as exc:
            logger.warning(f"get_my_courses failed: {exc}")
            return "I could not retrieve the course list right now."

    def get_course_details(course_name_or_code: str) -> str:
        """Get the modules and teacher for a specific course.
        Call when the student asks about a course's content, syllabus, or teacher.
        Args:
            course_name_or_code: Course name or code, e.g. 'CS101' or 'Python Basics'.
        """
        try:
            courses = _api_get(f"/institutes/{institute_id}/courses")
            q = course_name_or_code.lower().strip()
            matches = [
                c for c in courses
                if q in c.get("name", "").lower() or q in c.get("code", "").lower()
            ]
            if not matches:
                return f"I could not find a course matching '{course_name_or_code}'."
            c = matches[0]
            t = c.get("assignedTeacher")
            tname = f"{t.get('firstName', '')} {t.get('lastName', '')}".strip() if t else "no teacher assigned"
            modules = c.get("modules", [])
            mod_titles = [m.get("title", "Untitled") for m in sorted(modules, key=lambda x: x.get("order", 0))]
            mod_str = ", ".join(mod_titles[:8]) if mod_titles else "no modules yet"
            return (
                f"{c.get('name')} is taught by {tname}. "
                f"It has {len(modules)} module(s): {mod_str}."
            )
        except Exception as exc:
            logger.warning(f"get_course_details failed: {exc}")
            return "I could not retrieve course details right now."

    def get_my_teachers() -> str:
        """List all teachers in this institute and the courses they teach.
        Call when the student asks who their teacher is.
        """
        try:
            courses = _api_get(f"/institutes/{institute_id}/courses")
            teacher_map: dict[str, dict] = {}
            for c in courses:
                t = c.get("assignedTeacher")
                if t and t.get("id"):
                    tid = t["id"]
                    if tid not in teacher_map:
                        teacher_map[tid] = {
                            "name": f"{t.get('firstName', '')} {t.get('lastName', '')}".strip(),
                            "courses": [],
                        }
                    teacher_map[tid]["courses"].append(c.get("name", "Unknown"))
            if not teacher_map:
                return "There are no teachers assigned yet."
            lines = [
                f"{info['name']} teaches {', '.join(info['courses'])}"
                for info in list(teacher_map.values())[:5]
            ]
            return ". ".join(lines) + "."
        except Exception as exc:
            logger.warning(f"get_my_teachers failed: {exc}")
            return "I could not retrieve teacher information right now."

    return [
        FunctionTool(func=get_my_courses),
        FunctionTool(func=get_course_details),
        FunctionTool(func=get_my_teachers),
    ]


# ── Teacher-facing tools ──────────────────────────────────────────────────────

def make_teacher_api_tools(institute_id: str) -> list[FunctionTool]:
    """Return live-data tools scoped to the given institute for teacher sessions."""

    def get_my_courses() -> str:
        """List all courses in this institute with module counts.
        Call when the teacher asks about courses or their teaching load.
        """
        try:
            courses = _api_get(f"/institutes/{institute_id}/courses")
            if not courses:
                return "There are no courses in this institute yet."
            parts = [
                f"{c.get('name')} ({len(c.get('modules', []))} module(s))"
                for c in courses[:10]
            ]
            return f"{len(courses)} course(s): {', '.join(parts)}."
        except Exception as exc:
            logger.warning(f"get_my_courses (teacher) failed: {exc}")
            return "I could not retrieve the course list right now."

    def get_my_students() -> str:
        """List students enrolled in this institute.
        Call when the teacher asks about their students or class size.
        """
        try:
            students = _api_get(f"/institutes/{institute_id}/users?role=student")
            if not students:
                return "There are no students enrolled yet."
            active = sum(1 for s in students if s.get("isActive", True))
            names = [
                f"{s.get('firstName', '')} {s.get('lastName', '')}".strip()
                for s in students[:5]
            ]
            suffix = f" and {len(students) - 5} more" if len(students) > 5 else ""
            return (
                f"There are {len(students)} student(s), {active} active. "
                f"Some names: {', '.join(names)}{suffix}."
            )
        except Exception as exc:
            logger.warning(f"get_my_students failed: {exc}")
            return "I could not retrieve student information right now."

    def find_student(name_query: str) -> str:
        """Search for a specific student by name.
        Call when the teacher asks about a particular student.
        Args:
            name_query: Student name or partial name to search for.
        """
        try:
            students = _api_get(f"/institutes/{institute_id}/users?role=student")
            q = name_query.lower().strip()
            matches = [
                s for s in students
                if q in f"{s.get('firstName', '')} {s.get('lastName', '')}".lower()
                or q in s.get("email", "").lower()
            ]
            if not matches:
                return f"No student found matching '{name_query}'."
            s = matches[0]
            name = f"{s.get('firstName', '')} {s.get('lastName', '')}".strip()
            status = "active" if s.get("isActive", True) else "inactive"
            return f"{name} is {status}. Email: {s.get('email', 'unknown')}."
        except Exception as exc:
            logger.warning(f"find_student failed: {exc}")
            return "I could not search for students right now."

    def get_course_details(course_name_or_code: str) -> str:
        """Get details about a specific course including its modules.
        Call when the teacher asks about a course's content or structure.
        Args:
            course_name_or_code: Course name or code.
        """
        try:
            courses = _api_get(f"/institutes/{institute_id}/courses")
            q = course_name_or_code.lower().strip()
            matches = [
                c for c in courses
                if q in c.get("name", "").lower() or q in c.get("code", "").lower()
            ]
            if not matches:
                return f"No course found matching '{course_name_or_code}'."
            c = matches[0]
            modules = c.get("modules", [])
            mod_titles = [m.get("title", "Untitled") for m in sorted(modules, key=lambda x: x.get("order", 0))]
            mod_str = ", ".join(mod_titles[:8]) if mod_titles else "no modules yet"
            return (
                f"{c.get('name')} has {len(modules)} module(s): {mod_str}. "
                f"Description: {c.get('description', 'none')[:120]}."
            )
        except Exception as exc:
            logger.warning(f"get_course_details (teacher) failed: {exc}")
            return "I could not retrieve course details right now."

    return [
        FunctionTool(func=get_my_courses),
        FunctionTool(func=get_my_students),
        FunctionTool(func=find_student),
        FunctionTool(func=get_course_details),
    ]
