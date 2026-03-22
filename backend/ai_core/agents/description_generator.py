"""Agno-based description generation agent."""

from __future__ import annotations

from agno.agent import Agent
from pydantic import BaseModel

from config import settings
from agents.quiz_generator import _make_model


# ─── Output schema ────────────────────────────────────────────────


class DescriptionOut(BaseModel):
    description: str


# ─── Agent factory ────────────────────────────────────────────────


def _build_agent() -> Agent:
    return Agent(
        model=_make_model(),
        description=(
            "You are a professional academic content writer. "
            "You generate clear, concise, and engaging descriptions for educational content."
        ),
        instructions=[
            "Generate a description based on the user's prompt.",
            "Keep it 2–4 sentences, professional and informative.",
            "Do NOT add headings, bullet points, or any markdown.",
            "Return ONLY valid JSON matching the DescriptionOut schema.",
        ],
        response_model=DescriptionOut,
        structured_outputs=True,
    )


# ─── Public API ───────────────────────────────────────────────────


async def generate_description(prompt: str, context: str | None = None) -> str:
    """Generate a description from a user prompt and optional context."""
    agent = _build_agent()

    full_prompt = prompt
    if context:
        full_prompt = f"Context: {context}\n\nPrompt: {prompt}"

    result = await agent.arun(full_prompt)

    if isinstance(result.content, DescriptionOut):
        return result.content.description

    # Fallback
    import json
    raw = result.content if isinstance(result.content, str) else str(result.content)
    return DescriptionOut.model_validate(json.loads(raw)).description
