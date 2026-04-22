"""Teacher AI tools router — lesson plans, essay grading, class insights, at-risk analysis."""

import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.teacher_tools_agent import (
    analyze_at_risk_students,
    generate_class_insights,
    generate_lesson_plan,
    grade_essay,
    grade_short_answer,
    get_adaptive_recommendations,
)
from utils.document_extractor import extract_text

router = APIRouter(prefix="/api/teacher-tools", tags=["teacher-tools"])


# ── Lesson plan ────────────────────────────────────────────────────────────────


class LessonPlanRequest(BaseModel):
    topic: str = ""
    subject: str = ""
    gradeLevel: str = ""
    durationMinutes: int = 60
    objectives: list[str] = []
    additionalContext: str = ""


@router.post("/lesson-plan")
async def create_lesson_plan(
    # JSON body fields (used when no file is uploaded)
    body: LessonPlanRequest | None = None,
    # Multipart fields (used when a file is uploaded alongside form data)
    file: UploadFile | None = File(default=None),
    topic: str | None = Form(default=None),
    subject: str | None = Form(default=None),
    gradeLevel: str | None = Form(default=None),
    durationMinutes: str | None = Form(default=None),
    objectives: str | None = Form(default=None),
    additionalContext: str | None = Form(default=None),
):
    # Resolve fields: prefer form data over JSON body
    resolved_topic      = topic      or (body.topic      if body else "") or ""
    resolved_subject    = subject    or (body.subject    if body else "") or ""
    resolved_grade      = gradeLevel or (body.gradeLevel if body else "") or ""
    resolved_duration   = int(durationMinutes) if durationMinutes else (body.durationMinutes if body else 60)
    resolved_objectives = json.loads(objectives) if objectives else (body.objectives if body else [])
    resolved_context    = additionalContext or (body.additionalContext if body else "") or ""

    # Extract text from uploaded file and append to context
    if file and file.filename:
        try:
            file_bytes = await file.read()
            extracted  = extract_text(file_bytes, file.filename)
            resolved_context = f"{resolved_context}\n\n--- Uploaded material ({file.filename}) ---\n{extracted[:8000]}"
            if not resolved_topic.strip():
                resolved_topic = f"Content from {file.filename}"
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not extract text from file: {exc}")

    if not resolved_topic.strip():
        raise HTTPException(status_code=400, detail="topic is required (or upload a file).")

    try:
        plan = await generate_lesson_plan(
            topic=resolved_topic,
            subject=resolved_subject,
            grade_level=resolved_grade,
            duration_minutes=resolved_duration,
            objectives=resolved_objectives,
            additional_context=resolved_context,
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


# ── Short-answer NLP grader ────────────────────────────────────────────────────


class ShortAnswerGradeRequest(BaseModel):
    question: str
    studentAnswer: str
    maxMarks: int
    sampleAnswer: str = ""
    keywords: list[str] = []


@router.post("/grade-short-answer")
async def grade_short_answer_endpoint(body: ShortAnswerGradeRequest):
    if not body.studentAnswer.strip():
        raise HTTPException(status_code=400, detail="studentAnswer is required.")
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="question is required.")
    if body.maxMarks < 1:
        raise HTTPException(status_code=400, detail="maxMarks must be at least 1.")
    try:
        result = await grade_short_answer(
            question=body.question,
            student_answer=body.studentAnswer,
            max_marks=body.maxMarks,
            sample_answer=body.sampleAnswer,
            keywords=body.keywords,
        )
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Short-answer grading failed: {exc}")


# ── Adaptive learning recommendations ─────────────────────────────────────────


class WeakStrongTopic(BaseModel):
    topic: str
    score: float
    maxScore: float


class AdaptiveRecommendationsRequest(BaseModel):
    studentId: str
    weakTopics: list[WeakStrongTopic] = []
    strongTopics: list[WeakStrongTopic] = []
    overallAverage: float = 0.0


router_ai_tools = APIRouter(prefix="/api/ai-tools", tags=["ai-tools"])


@router_ai_tools.post("/adaptive-recommendations")
async def adaptive_recommendations_endpoint(body: AdaptiveRecommendationsRequest):
    if not body.weakTopics and not body.strongTopics:
        raise HTTPException(status_code=400, detail="At least one topic entry is required.")
    try:
        result = await get_adaptive_recommendations(
            weak_topics=[t.model_dump() for t in body.weakTopics],
            strong_topics=[t.model_dump() for t in body.strongTopics],
            overall_average=body.overallAverage,
        )
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Adaptive recommendations failed: {exc}")


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
