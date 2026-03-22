"""Description generation router."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.description_generator import generate_description

router = APIRouter(prefix="/api/description", tags=["description"])


class DescriptionRequest(BaseModel):
    prompt: str
    context: str | None = None


class DescriptionResponse(BaseModel):
    description: str


@router.post("/generate", response_model=DescriptionResponse)
async def generate(body: DescriptionRequest):
    """
    Generate a professional description using AI.
    Provide a prompt (and optional context) to get a 2–4 sentence description.
    """
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    try:
        description = await generate_description(body.prompt, body.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    return DescriptionResponse(description=description)
