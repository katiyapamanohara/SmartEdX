"""Quiz generation router."""

from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.quiz_generator import QuizOut, QuizQuestionOut, generate_quiz
from utils.document_extractor import extract_text

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

SUPPORTED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
}

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc", ".pptx", ".ppt"}


class GenerateResponse(BaseModel):
    questions: list[QuizQuestionOut]


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    file: UploadFile = File(..., description="PDF, DOCX, or PPTX document"),
    num_questions: int = Form(5, ge=1, le=20),
    difficulty: Literal["easy", "medium", "hard"] = Form("medium"),
):
    """
    Upload a document and generate AI-powered quiz questions using Agno.
    Supports PDF, Word (.docx/.doc) and PowerPoint (.pptx/.ppt).
    """
    from pathlib import Path

    ext = Path(file.filename or "").suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(SUPPORTED_EXTENSIONS)}",
        )

    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text = extract_text(raw, file.filename or f"document{ext}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not extract text: {e}")

    if len(text.strip()) < 50:
        raise HTTPException(
            status_code=422,
            detail="Document appears to have no readable text content.",
        )

    try:
        result: QuizOut = await generate_quiz(text, num_questions, difficulty)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    return GenerateResponse(questions=result.questions)
