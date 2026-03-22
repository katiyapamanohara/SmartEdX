"""Agno-based quiz generation agent."""

from __future__ import annotations

import uuid
from typing import Literal, Optional

from agno.agent import Agent
from pydantic import BaseModel, Field

from config import settings


# ─── Output schema ────────────────────────────────────────────────


class QuizQuestionOut(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    options: list[str] = Field(..., min_length=4, max_length=4)
    correctAnswer: int = Field(..., ge=0, le=3)
    explanation: Optional[str] = None


class QuizOut(BaseModel):
    questions: list[QuizQuestionOut]


# ─── Agent factory ────────────────────────────────────────────────


def _make_model():
    if settings.AI_PROVIDER == "openai":
        from agno.models.openai import OpenAIChat
        return OpenAIChat(id=settings.MODEL_ID, api_key=settings.OPENAI_API_KEY)

    if settings.AI_PROVIDER == "gemini":
        from agno.models.google import Gemini
        return Gemini(id=settings.MODEL_ID, api_key=settings.GOOGLE_API_KEY)

    from agno.models.anthropic import Claude
    return Claude(id=settings.MODEL_ID, api_key=settings.ANTHROPIC_API_KEY)


def _build_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are an expert educational quiz creator. "
            "When given document content, you generate high-quality multiple-choice quiz questions "
            "that test understanding of the key concepts."
        ),
        instructions=[
            "Read the provided document content carefully.",
            "Generate exactly the requested number of multiple-choice questions.",
            "Each question must have EXACTLY 4 answer options (A, B, C, D).",
            "correctAnswer is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).",
            "Vary question difficulty according to the requested level.",
            "Questions should test understanding, not just memorisation.",
            "Provide a brief explanation for the correct answer.",
            "Return ONLY valid JSON matching the QuizOut schema.",
        ],
        response_model=QuizOut,
        structured_outputs=True,
    )


# ─── Public API ───────────────────────────────────────────────────


async def generate_quiz(
    text: str,
    num_questions: int = 5,
    difficulty: Literal["easy", "medium", "hard"] = "medium",
) -> QuizOut:
    """Generate quiz questions from extracted document text."""

    agent = _build_agent()

    prompt = (
        f"Generate {num_questions} {difficulty}-difficulty multiple-choice quiz questions "
        f"based on the following document content.\n\n"
        f"--- DOCUMENT CONTENT START ---\n"
        f"{text[:12000]}\n"          # cap at ~12 k chars to stay within context limits
        f"--- DOCUMENT CONTENT END ---"
    )

    result = await agent.arun(prompt)

    # Agno returns the parsed response_model directly on result.content
    if isinstance(result.content, QuizOut):
        return result.content

    # Fallback: if raw string returned, attempt JSON parse
    import json
    raw = result.content if isinstance(result.content, str) else str(result.content)
    return QuizOut.model_validate(json.loads(raw))
