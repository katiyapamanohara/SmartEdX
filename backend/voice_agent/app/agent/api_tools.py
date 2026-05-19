"""Live institute API tools for the voice agent.

Creates Google ADK-compatible FunctionTool closures that call the SmartEdX
institute service to answer questions about courses, students, and teachers.
Responses are kept short and voice-friendly (no markdown, no emoji).

Route prefix: INSTITUTE_SERVICE_URL + /api/institutes/<controller-path>
  e.g. http://localhost:5003/api/institutes/institutes/{id}/courses
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from google.adk.tools import FunctionTool

from app.config import API_KEY, INSTITUTE_SERVICE_URL

logger = logging.getLogger(__name__)

# All routes on the institute service are prefixed by the NestJS global prefix.
_PREFIX = "/api/institutes"


def _get(path: str, token: str = "") -> Any:
    """Synchronous GET to the institute service."""
    url = f"{INSTITUTE_SERVICE_URL.rstrip('/')}{_PREFIX}{path}"
    auth = token or API_KEY
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if auth:
        headers["Authorization"] = f"Bearer {auth}"
    with httpx.Client(timeout=8) as c:
        r = c.get(url, headers=headers)
        r.raise_for_status()
        return r.json()


def _post(path: str, payload: dict, token: str = "") -> Any:
    """Synchronous POST to the institute service."""
    url = f"{INSTITUTE_SERVICE_URL.rstrip('/')}{_PREFIX}{path}"
    auth = token or API_KEY
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if auth:
        headers["Authorization"] = f"Bearer {auth}"
    with httpx.Client(timeout=15) as c:
        r = c.post(url, headers=headers, json=payload)
        r.raise_for_status()
        return r.json()


# ── Student-facing tools ──────────────────────────────────────────────────────

def make_student_api_tools(institute_id: str, user_token: str = "") -> list[FunctionTool]:
    """Return live-data tools scoped to the given institute for student sessions."""

    def get_my_courses() -> str:
        """List all courses available in this institute.
        Call when the student asks what courses are available or what they are enrolled in.
        """
        try:
            courses = _get(f"/institutes/{institute_id}/courses", user_token)
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
            courses = _get(f"/institutes/{institute_id}/courses", user_token)
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
            courses = _get(f"/institutes/{institute_id}/courses", user_token)
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

def make_teacher_api_tools(institute_id: str, user_token: str = "") -> list[FunctionTool]:
    """Return live-data tools scoped to the given institute for teacher sessions."""

    def get_my_courses() -> str:
        """List all courses in this institute with module counts.
        Call when the teacher asks about courses or their teaching load.
        """
        try:
            courses = _get(f"/institutes/{institute_id}/courses", user_token)
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
            students = _get(f"/institutes/{institute_id}/users?role=student", user_token)
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
            students = _get(f"/institutes/{institute_id}/users?role=student", user_token)
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
            courses = _get(f"/institutes/{institute_id}/courses", user_token)
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


# ── Institute admin tools (analytics + create/invite) ────────────────────────

def make_institute_admin_api_tools(institute_id: str, user_token: str = "") -> list[FunctionTool]:
    """Return management tools for the institute admin voice agent.

    All calls use the user_token (admin JWT) for authentication.
    Falls back to the service API_KEY if no user_token is provided.
    """

    def get_institute_analytics() -> str:
        """Fetch live analytics: total students, teachers, courses, and a brief course breakdown.
        Call when asked about institute stats, performance, enrollment, or growth.
        """
        try:
            students = _get(f"/institutes/{institute_id}/users?role=student", user_token)
            teachers = _get(f"/institutes/{institute_id}/users?role=teacher", user_token)
            courses  = _get(f"/institutes/{institute_id}/courses", user_token)
            active   = sum(1 for s in students if s.get("isActive", True))
            ratio    = len(students) / max(len(teachers), 1)
            top = courses[:5]
            course_summary = "; ".join(
                f"{c.get('name')} with {len(c.get('enrolledStudents', []))} students"
                for c in top
            )
            return (
                f"The institute has {len(students)} students ({active} active), "
                f"{len(teachers)} teachers, and {len(courses)} courses. "
                f"Student-teacher ratio is {ratio:.1f} to 1. "
                + (f"Top courses: {course_summary}." if course_summary else "")
            )
        except Exception as exc:
            logger.warning(f"get_institute_analytics failed: {exc}")
            return "I could not retrieve the analytics right now."

    def get_teacher_performance() -> str:
        """Get each teacher's name, courses taught, and total students.
        Call when asked about teacher workload, performance, or assignments.
        """
        try:
            teachers = _get(f"/institutes/{institute_id}/users?role=teacher", user_token)
            courses  = _get(f"/institutes/{institute_id}/courses", user_token)
            teacher_courses: dict[str, list] = {}
            for c in courses:
                t = c.get("assignedTeacher")
                if t and t.get("id"):
                    teacher_courses.setdefault(t["id"], []).append(c)
            if not teachers:
                return "No teachers found in this institute."
            parts = []
            for t in teachers[:8]:
                tid  = t.get("id", "")
                name = f"{t.get('firstName', '')} {t.get('lastName', '')}".strip() or "Unknown"
                tc   = teacher_courses.get(tid, [])
                enrolled = sum(len(c.get("enrolledStudents", [])) for c in tc)
                parts.append(f"{name} teaches {len(tc)} course(s) with {enrolled} students total")
            return ". ".join(parts) + "."
        except Exception as exc:
            logger.warning(f"get_teacher_performance failed: {exc}")
            return "I could not retrieve teacher performance right now."

    def get_course_enrollment() -> str:
        """Get enrollment numbers for every course.
        Call when asked about how many students are in a course or overall enrollment.
        """
        try:
            courses = _get(f"/institutes/{institute_id}/courses", user_token)
            if not courses:
                return "There are no courses in this institute yet."
            parts = []
            for c in courses[:10]:
                t = c.get("assignedTeacher")
                tname = f"{t.get('firstName', '')} {t.get('lastName', '')}".strip() if t else "unassigned"
                enrolled = len(c.get("enrolledStudents", []))
                parts.append(f"{c.get('name')} has {enrolled} students and is taught by {tname}")
            return ". ".join(parts) + "."
        except Exception as exc:
            logger.warning(f"get_course_enrollment failed: {exc}")
            return "I could not retrieve enrollment data right now."

    def get_revenue_analytics() -> str:
        """Get estimated revenue breakdown by course based on enrollment and course pricing.
        Call when asked about revenue, income, earnings, or financial performance.
        """
        try:
            institute = _get(f"/institutes/{institute_id}", user_token)
            courses   = _get(f"/institutes/{institute_id}/courses", user_token)
            currency  = institute.get("currency", "") if isinstance(institute, dict) else ""
            if not courses:
                return "There are no courses yet so there is no revenue to report."
            total = 0.0
            parts = []
            for c in courses[:20]:
                enrolled     = len(c.get("enrolledStudents", []))
                payment_type = c.get("paymentType", "fixed")
                price        = float(c.get("price") or 0)
                monthly      = float(c.get("monthlyPrice") or 0)
                if payment_type == "monthly" and monthly:
                    course_rev = enrolled * monthly
                    label = f"{c.get('name')}: {enrolled} students × {currency}{monthly:.2f}/mo = {currency}{course_rev:.2f}/mo"
                elif price:
                    course_rev = enrolled * price
                    label = f"{c.get('name')}: {enrolled} students × {currency}{price:.2f} = {currency}{course_rev:.2f}"
                else:
                    course_rev = 0.0
                    label = f"{c.get('name')}: {enrolled} students, no price set"
                total += course_rev
                parts.append(label)
            breakdown = ". ".join(parts)
            return (
                f"Estimated revenue across {len(courses)} course(s): {currency}{total:.2f}. "
                f"Breakdown: {breakdown}."
            )
        except Exception as exc:
            logger.warning(f"get_revenue_analytics failed: {exc}")
            return "I could not retrieve revenue data right now."

    def create_course(name: str, code: str, description: str, batch_number: str) -> str:
        """Create a new course in the institute.
        Collect all fields before calling: name, code (e.g. CS101), description, batch_number.
        Always confirm details with the user before calling.
        Args:
            name: Full course name.
            code: Short course code, e.g. CS101.
            description: Brief course description.
            batch_number: Batch identifier, e.g. Batch 1 or 2024-A.
        """
        try:
            course = _post(
                f"/institutes/{institute_id}/courses",
                {"name": name, "code": code, "description": description, "batchNumber": batch_number},
                user_token,
            )
            return (
                f"Course created successfully. "
                f"Name: {course.get('name')}, Code: {course.get('code')}, "
                f"Batch: {course.get('batchNumber')}."
            )
        except httpx.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get("message", exc.response.text)
            except Exception:
                detail = exc.response.text
            return f"Failed to create course: {detail}"
        except Exception as exc:
            logger.warning(f"create_course failed: {exc}")
            return "Course creation failed. Please try again."

    def invite_lecturer(email: str, first_name: str, last_name: str) -> str:
        """Invite a new lecturer to the institute by email.
        Always confirm the full name and email with the user before calling.
        Do NOT call this to remove or delete anyone.
        Args:
            email: Lecturer's email address.
            first_name: First name.
            last_name: Last name.
        """
        try:
            _post(
                f"/institutes/{institute_id}/users",
                {"email": email, "firstName": first_name, "lastName": last_name, "role": "teacher"},
                user_token,
            )
            return (
                f"Lecturer invited successfully. "
                f"{first_name} {last_name} at {email} has been added as a teacher."
            )
        except httpx.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get("message", exc.response.text)
            except Exception:
                detail = exc.response.text
            return f"Failed to invite lecturer: {detail}"
        except Exception as exc:
            logger.warning(f"invite_lecturer failed: {exc}")
            return "Lecturer invitation failed. Please try again."

    return [
        FunctionTool(func=get_institute_analytics),
        FunctionTool(func=get_teacher_performance),
        FunctionTool(func=get_course_enrollment),
        FunctionTool(func=get_revenue_analytics),
        FunctionTool(func=create_course),
        FunctionTool(func=invite_lecturer),
    ]
