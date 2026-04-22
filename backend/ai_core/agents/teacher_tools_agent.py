"""Teacher AI tools — lesson plan generator, essay grader, class insights, at-risk analysis."""

from __future__ import annotations

import copy
import uuid
from typing import Literal, Optional

from agno.agent import Agent
from pydantic import BaseModel, Field

from config import settings


# ─── Gemini-safe base (strips 'default' from JSON schema) ────────────────────


def _strip_defaults(obj: object) -> object:
    if isinstance(obj, dict):
        obj.pop("default", None)
        for v in obj.values():
            _strip_defaults(v)
    elif isinstance(obj, list):
        for item in obj:
            _strip_defaults(item)
    return obj


class _GeminiSafe(BaseModel):
    @classmethod
    def model_json_schema(cls, **kwargs):
        return _strip_defaults(copy.deepcopy(super().model_json_schema(**kwargs)))


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


# ══════════════════════════════════════════════════════════════════════════════
# 1. LESSON PLAN GENERATOR
# ══════════════════════════════════════════════════════════════════════════════


class LessonActivity(_GeminiSafe):
    duration: str
    title: str
    description: str
    activityType: Literal["introduction", "lecture", "discussion", "activity", "assessment", "wrap-up"]


class LessonPlanOut(_GeminiSafe):
    title: str
    subject: str
    gradeLevel: str
    totalDuration: str
    learningObjectives: list[str]
    materialsNeeded: list[str]
    activities: list[LessonActivity]
    assessmentStrategy: str
    homework: Optional[str] = None
    teacherNotes: Optional[str] = None
    differentiationTips: Optional[str] = None


def _build_lesson_plan_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert curriculum designer and educator. You create detailed, "
            "engaging, and pedagogically sound lesson plans tailored to the teacher's needs."
        ),
        instructions=[
            "Generate a complete, ready-to-use lesson plan based on the teacher's inputs.",
            "Include a variety of activity types: intro, lecture, discussion, hands-on activity, assessment.",
            "Learning objectives must be specific, measurable, and achievable (SMART).",
            "Activities should be time-boxed and total exactly the requested duration.",
            "Materials should be practical and readily available.",
            "Include differentiation tips for advanced and struggling learners.",
            "Teacher notes should include common misconceptions and how to address them.",
            "Return ONLY valid JSON matching the schema exactly.",
        ],
        response_model=LessonPlanOut,
        structured_outputs=True,
    )


async def generate_lesson_plan(
    topic: str,
    subject: str,
    grade_level: str,
    duration_minutes: int,
    objectives: list[str],
    additional_context: str = "",
) -> LessonPlanOut:
    agent = _build_lesson_plan_agent()
    prompt = (
        f"Create a lesson plan with the following details:\n"
        f"Topic: {topic}\n"
        f"Subject: {subject}\n"
        f"Grade/Level: {grade_level}\n"
        f"Duration: {duration_minutes} minutes\n"
        f"Learning Objectives: {', '.join(objectives) if objectives else 'To be determined by content'}\n"
    )
    if additional_context:
        prompt += f"Additional context: {additional_context}\n"

    result = await agent.arun(prompt)
    if isinstance(result.content, LessonPlanOut):
        return result.content
    raise ValueError(f"Unexpected response type: {type(result.content)}")


# ══════════════════════════════════════════════════════════════════════════════
# 2. SHORT-ANSWER NLP GRADER  (auto-graded at submission; measures alignment)
# ══════════════════════════════════════════════════════════════════════════════


class ShortAnswerGradeOut(_GeminiSafe):
    score: int                    # marks awarded (0 – maxMarks)
    maxMarks: int
    percentage: float             # (score / maxMarks) * 100
    alignmentScore: int           # 0-100 semantic similarity to model answer
    feedback: str                 # 1-2 sentence constructive comment
    keywordsMatched: list[str]    # expected keywords present in student answer
    keywordsMissed: list[str]     # expected keywords absent from student answer


def _build_short_answer_grader_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert teacher grading short-answer exam questions. "
            "You assess semantic alignment between the student answer and the model answer, "
            "award marks proportionally, and provide brief, constructive feedback."
        ),
        instructions=[
            "Grade the student's short answer against the model/sample answer and any provided keywords.",
            "alignmentScore: 0-100 representing semantic similarity (100 = identical meaning, 0 = completely off-topic).",
            "score must be proportional to alignmentScore and between 0 and maxMarks (inclusive).",
            "Full marks (score == maxMarks) only when alignmentScore >= 85.",
            "keywordsMatched: list of provided keywords (or synonyms) present in the student answer.",
            "keywordsMissed: list of provided keywords clearly absent from the student answer.",
            "feedback: 1-2 sentences, specific and constructive. Acknowledge what was correct.",
            "percentage = (score / maxMarks) * 100, rounded to 1 decimal.",
            "Return ONLY valid JSON matching the schema exactly.",
        ],
        response_model=ShortAnswerGradeOut,
        structured_outputs=True,
    )


async def grade_short_answer(
    question: str,
    student_answer: str,
    max_marks: int,
    sample_answer: str = "",
    keywords: list[str] | None = None,
) -> ShortAnswerGradeOut:
    agent = _build_short_answer_grader_agent()
    prompt = (
        f"Grade the following short-answer response:\n\n"
        f"QUESTION:\n{question}\n\n"
        f"STUDENT ANSWER:\n{student_answer}\n\n"
        f"MAX MARKS: {max_marks}\n"
    )
    if sample_answer:
        prompt += f"\nMODEL ANSWER:\n{sample_answer}\n"
    if keywords:
        prompt += f"\nEXPECTED KEYWORDS: {', '.join(keywords)}\n"

    result = await agent.arun(prompt)
    if isinstance(result.content, ShortAnswerGradeOut):
        return result.content
    raise ValueError(f"Unexpected response type: {type(result.content)}")


# ══════════════════════════════════════════════════════════════════════════════
# 3. ADAPTIVE LEARNING RECOMMENDATIONS
# ══════════════════════════════════════════════════════════════════════════════


class AdaptiveRecommendationOut(_GeminiSafe):
    recommendations: list[str]   # 3-5 specific, actionable study recommendations
    studyPlan: str                # short paragraph personalised study plan


def _build_adaptive_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are a personalised learning coach. Based on a student's performance data "
            "you generate targeted study recommendations and a brief personalised study plan."
        ),
        instructions=[
            "Analyse the student's weak and strong topics provided.",
            "Generate 3-5 specific, actionable recommendations addressing the weakest topics first.",
            "Each recommendation should name the topic and suggest a concrete study action.",
            "studyPlan: 2-3 sentence personalised paragraph using encouraging, growth-mindset language.",
            "Do not repeat the same recommendation twice.",
            "Return ONLY valid JSON matching the schema exactly.",
        ],
        response_model=AdaptiveRecommendationOut,
        structured_outputs=True,
    )


async def get_adaptive_recommendations(
    weak_topics: list[dict],
    strong_topics: list[dict],
    overall_average: float,
) -> AdaptiveRecommendationOut:
    agent = _build_adaptive_agent()
    prompt = (
        f"Student overall average: {overall_average:.1f}%\n\n"
        f"WEAK TOPICS (need improvement):\n"
    )
    for t in weak_topics:
        pct = round(t['score'] / t['maxScore'] * 100, 1) if t['maxScore'] else 0
        prompt += f"  - {t['topic']}: {pct}% ({t['score']}/{t['maxScore']})\n"
    prompt += "\nSTRONG TOPICS:\n"
    for t in strong_topics:
        pct = round(t['score'] / t['maxScore'] * 100, 1) if t['maxScore'] else 0
        prompt += f"  - {t['topic']}: {pct}% ({t['score']}/{t['maxScore']})\n"

    result = await agent.arun(prompt)
    if isinstance(result.content, AdaptiveRecommendationOut):
        return result.content
    raise ValueError(f"Unexpected response type: {type(result.content)}")


# ══════════════════════════════════════════════════════════════════════════════
# 4. ESSAY GRADER
# ══════════════════════════════════════════════════════════════════════════════


class EssayRubricItem(_GeminiSafe):
    criterion: str
    maxMarks: int
    awardedMarks: int
    comment: str


class EssayGradeOut(_GeminiSafe):
    score: int
    maxMarks: int
    percentage: float
    grade: Literal["A", "B", "C", "D", "F"]
    overallFeedback: str
    strengths: list[str]
    areasForImprovement: list[str]
    rubricBreakdown: list[EssayRubricItem]
    suggestedScore: int


def _build_essay_grader_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert teacher and academic assessor. You grade student essay answers "
            "fairly, consistently, and constructively, providing detailed feedback that helps "
            "students improve."
        ),
        instructions=[
            "Grade the essay based on the question, any provided rubric or sample answer, and the max marks.",
            "Break down marks across multiple rubric criteria (e.g., content, accuracy, clarity, depth).",
            "awardedMarks for each rubric item must not exceed maxMarks for that item.",
            "Total score (sum of rubricBreakdown awardedMarks) must equal suggestedScore.",
            "suggestedScore must be between 0 and maxMarks (inclusive).",
            "percentage = (suggestedScore / maxMarks) * 100, rounded to 1 decimal.",
            "Grade scale: A=90%+, B=75-89%, C=60-74%, D=50-59%, F=<50%.",
            "Strengths and areasForImprovement must each have 2-4 specific, actionable points.",
            "overallFeedback should be 2-3 sentences: balanced, constructive, and encouraging.",
            "Be fair — give credit for correct ideas even if expression is imperfect.",
            "Return ONLY valid JSON matching the schema exactly.",
        ],
        response_model=EssayGradeOut,
        structured_outputs=True,
    )


async def grade_essay(
    question: str,
    student_answer: str,
    max_marks: int,
    sample_answer: str = "",
    rubric: str = "",
) -> EssayGradeOut:
    agent = _build_essay_grader_agent()
    prompt = (
        f"Grade the following essay answer:\n\n"
        f"QUESTION:\n{question}\n\n"
        f"STUDENT ANSWER:\n{student_answer}\n\n"
        f"MAX MARKS: {max_marks}\n"
    )
    if sample_answer:
        prompt += f"\nSAMPLE/MODEL ANSWER (for reference):\n{sample_answer}\n"
    if rubric:
        prompt += f"\nGRADING RUBRIC:\n{rubric}\n"

    result = await agent.arun(prompt)
    if isinstance(result.content, EssayGradeOut):
        return result.content
    raise ValueError(f"Unexpected response type: {type(result.content)}")


# ══════════════════════════════════════════════════════════════════════════════
# 3. CLASS PERFORMANCE INSIGHTS
# ══════════════════════════════════════════════════════════════════════════════


class PerformanceInsight(_GeminiSafe):
    category: Literal["strength", "concern", "trend", "recommendation"]
    title: str
    description: str
    priority: Literal["high", "medium", "low"]


class ClassInsightsOut(_GeminiSafe):
    overallSummary: str
    classHealthScore: int  # 0-100
    insights: list[PerformanceInsight]
    weakAreas: list[str]
    strongAreas: list[str]
    recommendedActions: list[str]
    teachingStrategySuggestions: list[str]


def _build_class_insights_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert educational data analyst and pedagogy consultant. "
            "You analyze class performance data and provide actionable, evidence-based insights "
            "to help teachers improve learning outcomes."
        ),
        instructions=[
            "Analyze the provided class performance statistics carefully.",
            "classHealthScore is a holistic 0-100 score: 80+ is healthy, 60-79 needs attention, <60 is concerning.",
            "Identify 4-6 meaningful insights covering strengths, concerns, trends, and recommendations.",
            "weakAreas and strongAreas should name specific topics, skills, or assessment types.",
            "recommendedActions should be concrete, immediately actionable steps for the teacher.",
            "teachingStrategySuggestions should suggest pedagogical approaches (e.g., peer teaching, spaced practice).",
            "overallSummary should be 2-3 sentences: honest but constructive.",
            "Do not fabricate data — only analyze what is provided.",
            "Return ONLY valid JSON matching the schema exactly.",
        ],
        response_model=ClassInsightsOut,
        structured_outputs=True,
    )


async def generate_class_insights(
    course_name: str,
    total_students: int,
    quiz_stats: list[dict],
    exam_stats: list[dict],
    class_average: float,
    passing_rate: float,
) -> ClassInsightsOut:
    agent = _build_class_insights_agent()

    quiz_summary = "\n".join(
        f"  - {q['title']}: avg {q['avgScore']:.1f}%, {q['attemptRate']:.0f}% attempted"
        for q in quiz_stats
    ) if quiz_stats else "  No quiz data available."

    exam_summary = "\n".join(
        f"  - {e['title']}: avg {e['avgScore']:.1f}%, pass rate {e['passRate']:.0f}%"
        for e in exam_stats
    ) if exam_stats else "  No exam data available."

    prompt = (
        f"Analyze the class performance for: {course_name}\n\n"
        f"OVERVIEW:\n"
        f"  Total students: {total_students}\n"
        f"  Class average: {class_average:.1f}%\n"
        f"  Passing rate: {passing_rate:.1f}%\n\n"
        f"QUIZ PERFORMANCE:\n{quiz_summary}\n\n"
        f"EXAM PERFORMANCE:\n{exam_summary}\n"
    )

    result = await agent.arun(prompt)
    if isinstance(result.content, ClassInsightsOut):
        return result.content
    raise ValueError(f"Unexpected response type: {type(result.content)}")


# ══════════════════════════════════════════════════════════════════════════════
# 4. AT-RISK STUDENT ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════


class AtRiskStudentOut(_GeminiSafe):
    studentId: str
    studentName: str
    riskLevel: Literal["critical", "high", "medium", "watch"]
    riskScore: int  # 0-100, higher = more at risk
    primaryReasons: list[str]
    immediateActions: list[str]
    longTermRecommendations: list[str]


class AtRiskAnalysisOut(_GeminiSafe):
    executiveSummary: str
    atRiskStudents: list[AtRiskStudentOut]
    classwidePatterns: list[str]
    suggestedInterventions: list[str]
    totalAnalyzed: int
    atRiskCount: int


def _build_at_risk_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert in educational intervention and student success. "
            "You identify students at risk of academic failure and provide compassionate, "
            "evidence-based recommendations to help teachers intervene effectively."
        ),
        instructions=[
            "Analyze each student's performance data and assign a risk level.",
            "riskScore 0-100: 75+ = critical, 50-74 = high, 25-49 = medium, 10-24 = watch.",
            "Risk factors include: low scores, missing assignments, declining trends, no attempts.",
            "Only include students with riskScore >= 10 in atRiskStudents.",
            "primaryReasons must be specific data-driven observations (e.g., '0% on last 3 quizzes').",
            "immediateActions are things the teacher can do this week (e.g., 'Schedule 1-on-1 check-in').",
            "longTermRecommendations are strategies over weeks/months.",
            "classwidePatterns identify issues affecting multiple students.",
            "Be compassionate — focus on helping students, not judging them.",
            "executiveSummary: 2-3 sentences on overall class risk picture.",
            "Return ONLY valid JSON matching the schema exactly.",
        ],
        response_model=AtRiskAnalysisOut,
        structured_outputs=True,
    )


async def analyze_at_risk_students(
    students: list[dict],
    course_name: str,
) -> AtRiskAnalysisOut:
    agent = _build_at_risk_agent()

    student_lines = []
    for s in students:
        line = (
            f"  - {s['name']} (ID: {s['id']}): "
            f"quiz avg {s.get('quizAvg', 'N/A')}%, "
            f"exam avg {s.get('examAvg', 'N/A')}%, "
            f"overall {s.get('overallAvg', 'N/A')}%, "
            f"quizzes attempted {s.get('quizzesAttempted', 0)}/{s.get('totalQuizzes', 0)}, "
            f"exams attempted {s.get('examsAttempted', 0)}/{s.get('totalExams', 0)}"
        )
        student_lines.append(line)

    prompt = (
        f"Analyze at-risk students for course: {course_name}\n\n"
        f"STUDENT PERFORMANCE DATA ({len(students)} students):\n"
        + "\n".join(student_lines)
        + f"\n\ntotalAnalyzed = {len(students)}"
    )

    result = await agent.arun(prompt)
    if isinstance(result.content, AtRiskAnalysisOut):
        return result.content
    raise ValueError(f"Unexpected response type: {type(result.content)}")
