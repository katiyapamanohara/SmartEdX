"""Quiz generation router."""

from typing import Literal, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.quiz_generator import _is_rate_limit_error  # noqa: WPS450
from agents.quiz_generator import (
    QuizOut,
    QuizQuestionOut,
    UnifiedQuestion,
    UnifiedQuizOut,
    generate_quiz,
    generate_questions,
)
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


class GenerateUnifiedResponse(BaseModel):
    questions: list[UnifiedQuestion]


class GenerateFromTextRequest(BaseModel):
    text: str
    num_questions: int = 5
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_type: Literal["mcq", "essay", "both"] = "mcq"


@router.post("/generate-from-text", response_model=GenerateUnifiedResponse)
async def generate_from_text(body: GenerateFromTextRequest):
    """
    Generate AI-powered quiz questions from plain text/description.
    Supports MCQ, essay, or mixed question types.
    """
    if len(body.text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text is too short to generate questions from.")

    try:
        result: UnifiedQuizOut = await generate_questions(
            body.text,
            body.num_questions,
            body.difficulty,
            body.question_type,
        )
    except Exception as e:
        if _is_rate_limit_error(e):
            raise HTTPException(
                status_code=429,
                detail="The AI service is temporarily rate-limited. Please wait a moment and try again.",
            )
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    return GenerateUnifiedResponse(questions=result.questions)


@router.post("/generate-from-file", response_model=GenerateUnifiedResponse)
async def generate_from_file(
    file: UploadFile = File(..., description="PDF, DOCX, or PPTX document"),
    num_questions: int = Form(5, ge=1, le=20),
    difficulty: Literal["easy", "medium", "hard"] = Form("medium"),
    question_type: Literal["mcq", "essay", "both"] = Form("mcq"),
):
    """
    Upload a document and generate AI-powered quiz questions.
    Supports MCQ, essay, or mixed question types.
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
        result: UnifiedQuizOut = await generate_questions(text, num_questions, difficulty, question_type)
    except Exception as e:
        if _is_rate_limit_error(e):
            raise HTTPException(
                status_code=429,
                detail="The AI service is temporarily rate-limited. Please wait a moment and try again.",
            )
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    return GenerateUnifiedResponse(questions=result.questions)


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    file: UploadFile = File(..., description="PDF, DOCX, or PPTX document"),
    num_questions: int = Form(5, ge=1, le=20),
    difficulty: Literal["easy", "medium", "hard"] = Form("medium"),
):
    """
    Legacy endpoint: Upload a document and generate MCQ-only quiz questions.
    Use /generate-from-file for full support (MCQ/essay/both).
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
        if _is_rate_limit_error(e):
            raise HTTPException(
                status_code=429,
                detail="The AI service is temporarily rate-limited. Please wait a moment and try again.",
            )
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")

    return GenerateResponse(questions=result.questions)
