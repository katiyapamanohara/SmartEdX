"""Teacher AI tools router — lesson plans, essay grading, class insights, at-risk analysis."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.teacher_tools_agent import (
    analyze_at_risk_students,
    generate_class_insights,
    generate_lesson_plan,
    grade_essay,
)

router = APIRouter(prefix="/api/teacher-tools", tags=["teacher-tools"])


# ── Lesson plan ────────────────────────────────────────────────────────────────


class LessonPlanRequest(BaseModel):
    topic: str
    subject: str
    gradeLevel: str
    durationMinutes: int = 60
    objectives: list[str] = []
    additionalContext: str = ""


@router.post("/lesson-plan")
async def create_lesson_plan(body: LessonPlanRequest):
    if not body.topic.strip():
        raise HTTPException(status_code=400, detail="topic is required.")
    try:
        plan = await generate_lesson_plan(
            topic=body.topic,
            subject=body.subject,
            grade_level=body.gradeLevel,
            duration_minutes=body.durationMinutes,
            objectives=body.objectives,
            additional_context=body.additionalContext,
        )
        return plan.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Lesson plan generation failed: {exc}")


# ── Essay grader ───────────────────────────────────────────────────────────────


class EssayGradeRequest(BaseModel):
    question: str
    studentAnswer: str
    maxMarks: int
    sampleAnswer: str = ""
    rubric: str = ""


@router.post("/grade-essay")
async def grade_essay_endpoint(body: EssayGradeRequest):
    if not body.studentAnswer.strip():
        raise HTTPException(status_code=400, detail="studentAnswer is required.")
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="question is required.")
    if body.maxMarks < 1:
        raise HTTPException(status_code=400, detail="maxMarks must be at least 1.")
    try:
        result = await grade_essay(
            question=body.question,
            student_answer=body.studentAnswer,
            max_marks=body.maxMarks,
            sample_answer=body.sampleAnswer,
            rubric=body.rubric,
        )
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Essay grading failed: {exc}")


# ── Class insights ─────────────────────────────────────────────────────────────


class QuizStat(BaseModel):
    title: str
    avgScore: float
    attemptRate: float


class ExamStat(BaseModel):
    title: str
    avgScore: float
    passRate: float


class ClassInsightsRequest(BaseModel):
    courseName: str
    totalStudents: int
    classAverage: float
    passingRate: float
    quizStats: list[QuizStat] = []
    examStats: list[ExamStat] = []


@router.post("/class-insights")
async def get_class_insights(body: ClassInsightsRequest):
    if body.totalStudents < 1:
        raise HTTPException(status_code=400, detail="totalStudents must be at least 1.")
    try:
        result = await generate_class_insights(
            course_name=body.courseName,
            total_students=body.totalStudents,
            quiz_stats=[q.model_dump() for q in body.quizStats],
            exam_stats=[e.model_dump() for e in body.examStats],
            class_average=body.classAverage,
            passing_rate=body.passingRate,
        )
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Class insights generation failed: {exc}")


# ── At-risk analysis ───────────────────────────────────────────────────────────


class StudentPerformanceIn(BaseModel):
    id: str
    name: str
    quizAvg: float | None = None
    examAvg: float | None = None
    overallAvg: float | None = None
    quizzesAttempted: int = 0
    totalQuizzes: int = 0
    examsAttempted: int = 0
    totalExams: int = 0


class AtRiskRequest(BaseModel):
    courseName: str
    students: list[StudentPerformanceIn]


@router.post("/at-risk")
async def identify_at_risk(body: AtRiskRequest):
    if not body.students:
        raise HTTPException(status_code=400, detail="students list cannot be empty.")
    try:
        result = await analyze_at_risk_students(
            students=[s.model_dump() for s in body.students],
            course_name=body.courseName,
        )
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"At-risk analysis failed: {exc}")
