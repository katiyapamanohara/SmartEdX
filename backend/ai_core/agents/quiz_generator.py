"""Agno-based quiz generation agent — supports MCQ, Essay, and mixed types."""

from __future__ import annotations

import asyncio
import copy
import json
import logging
import uuid
from typing import Literal, Optional

from agno.agent import Agent
from pydantic import BaseModel, Field

from config import settings

logger = logging.getLogger(__name__)

# ─── Retry helper ────────────────────────────────────────────────────────────

_RATE_LIMIT_SIGNALS = (
    "429", "resource_exhausted", "rate limit", "quota", "too many requests",
    # 503 / capacity signals — Gemini returns these during demand spikes
    "503", "unavailable", "high demand", "service unavailable",
)


def _is_rate_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(sig in msg for sig in _RATE_LIMIT_SIGNALS)


async def _run_with_backoff(agent: Agent, prompt: str, max_attempts: int = 3):
    """Run agent.arun(prompt) with exponential backoff on transient errors.

    The agno Agent already retries internally (via its ``retries`` parameter),
    so this outer loop acts as a second safety net if the inner retries are all
    exhausted — giving us a total of up to ``max_attempts`` outer rounds, each
    with its own inner retry budget.
    """
    delays = [10, 30, 60]  # seconds between outer retry rounds
    last_exc: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            return await agent.arun(prompt)
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit_error(exc):
                if attempt < max_attempts:
                    wait = delays[attempt - 1]
                    logger.warning(
                        "Outer attempt %d/%d hit transient error — retrying in %ds. Error: %s",
                        attempt, max_attempts, wait, exc,
                    )
                    await asyncio.sleep(wait)
                else:
                    logger.error(
                        "All %d outer attempts exhausted. Last error: %s",
                        max_attempts, exc,
                    )
                    raise
            else:
                # Non-transient error — fail immediately
                raise

    raise last_exc  # unreachable but satisfies type checkers

QuestionType = Literal["mcq", "essay", "both"]


# ─── Gemini-compatible base ───────────────────────────────────────────────────
# Gemini rejects response schemas that contain "default" values.
# Overriding model_json_schema to strip them keeps Pydantic defaults for
# Python-side validation while sending a clean schema to the API.

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


# ─── Output schemas ───────────────────────────────────────────────────────────


class MCQQuestionOut(_GeminiSafe):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["mcq"] = "mcq"
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correctAnswer: int = Field(..., ge=0, le=3)
    explanation: Optional[str] = None
    marks: int = Field(default=1, ge=1)


class EssayQuestionOut(_GeminiSafe):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["essay"] = "essay"
    question: str
    sampleAnswer: Optional[str] = None   # Model answer visible to teacher only
    marks: int = Field(default=5, ge=1)


# Union type used by the response_model
class UnifiedQuestion(_GeminiSafe):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["mcq", "essay"]
    question: str
    # MCQ only
    options: Optional[list[str]] = None
    correctAnswer: Optional[int] = None
    explanation: Optional[str] = None
    # Essay only
    sampleAnswer: Optional[str] = None
    marks: int = Field(default=1, ge=1)


class UnifiedQuizOut(_GeminiSafe):
    questions: list[UnifiedQuestion]


# Keep backwards-compatible alias for existing consumers
class QuizQuestionOut(MCQQuestionOut):
    pass


class QuizOut(BaseModel):
    questions: list[MCQQuestionOut]


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


# ─── Agent builders ───────────────────────────────────────────────────────────


def _build_mcq_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert educational quiz creator. "
            "Generate high-quality multiple-choice questions that test deep understanding."
        ),
        instructions=[
            "Generate exactly the requested number of MCQ questions.",
            "Each question must have EXACTLY 4 answer options.",
            "correctAnswer is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).",
            "Vary difficulty according to the requested level.",
            "Provide a concise explanation for the correct answer.",
            "Set marks = 1 for easy, 2 for medium, 3 for hard.",
            "Return ONLY valid JSON matching the UnifiedQuizOut schema.",
        ],
        response_model=UnifiedQuizOut,
        structured_outputs=True,
        # Retry on transient Gemini errors (503 demand spikes, 429 rate limits)
        retries=3,
        delay_between_retries=5,
        exponential_backoff=True,
    )


def _build_essay_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert educator creating open-ended essay exam questions. "
            "Generate thought-provoking questions that require detailed written responses."
        ),
        instructions=[
            "Generate exactly the requested number of essay questions.",
            "Set type = 'essay' for every question.",
            "options, correctAnswer, and explanation must be null/omitted.",
            "Provide a sampleAnswer: a concise model answer (2-5 sentences) the teacher can use as a guide.",
            "Set marks based on difficulty: easy=3, medium=5, hard=10.",
            "Return ONLY valid JSON matching the UnifiedQuizOut schema.",
        ],
        response_model=UnifiedQuizOut,
        structured_outputs=True,
        retries=3,
        delay_between_retries=5,
        exponential_backoff=True,
    )


def _build_mixed_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert educator creating a mixed exam with both MCQ and essay questions."
        ),
        instructions=[
            "Generate the requested number of questions, split roughly 60% MCQ and 40% essay.",
            "For MCQ questions: set type='mcq', include 4 options, correctAnswer (0-3), explanation.",
            "For essay questions: set type='essay', include sampleAnswer, leave options/correctAnswer null.",
            "Set marks: MCQ easy=1/medium=2/hard=3, Essay easy=3/medium=5/hard=10.",
            "Return ONLY valid JSON matching the UnifiedQuizOut schema.",
        ],
        response_model=UnifiedQuizOut,
        structured_outputs=True,
        retries=3,
        delay_between_retries=5,
        exponential_backoff=True,
    )


# ─── Public API ───────────────────────────────────────────────────────────────


async def generate_quiz(
    text: str,
    num_questions: int = 5,
    difficulty: Literal["easy", "medium", "hard"] = "medium",
) -> QuizOut:
    """Legacy: generate MCQ-only quiz from document text (backwards compatible)."""
    result = await generate_questions(text, num_questions, difficulty, "mcq")
    # Convert to legacy QuizOut
    mcq_qs = []
    for q in result.questions:
        mcq_qs.append(MCQQuestionOut(
            id=q.id,
            type="mcq",
            question=q.question,
            options=q.options or ["", "", "", ""],
            correctAnswer=q.correctAnswer or 0,
            explanation=q.explanation,
            marks=q.marks,
        ))
    return QuizOut(questions=mcq_qs)


async def generate_questions(
    text: str,
    num_questions: int = 5,
    difficulty: Literal["easy", "medium", "hard"] = "medium",
    question_type: QuestionType = "mcq",
) -> UnifiedQuizOut:
    """Generate questions (MCQ, essay, or both) from any text source."""

    agent_map = {
        "mcq": _build_mcq_agent,
        "essay": _build_essay_agent,
        "both": _build_mixed_agent,
    }
    agent = agent_map[question_type]()

    type_label = {
        "mcq": "multiple-choice",
        "essay": "open-ended essay",
        "both": "mixed (MCQ and essay)",
    }[question_type]

    prompt = (
        f"Generate {num_questions} {difficulty}-difficulty {type_label} questions "
        f"based on the following content.\n\n"
        f"--- CONTENT START ---\n"
        f"{text[:12000]}\n"
        f"--- CONTENT END ---"
    )

    result = await _run_with_backoff(agent, prompt)

    if isinstance(result.content, UnifiedQuizOut):
        return result.content

    raw = result.content if isinstance(result.content, str) else str(result.content)
    return UnifiedQuizOut.model_validate(json.loads(raw))
