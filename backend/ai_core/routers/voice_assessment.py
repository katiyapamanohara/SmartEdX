"""Voice Assessment — generate questions and evaluate student answers."""

import io
import json

import pdfplumber
from docx import Document
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.voice_assessment_agent import evaluate_student_answers, generate_voice_questions

router = APIRouter(prefix="/api/voice-assessment", tags=["voice-assessment"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class GenerateResponse(BaseModel):
    questions: list[dict]


class EvaluateRequest(BaseModel):
    questions: list[dict]       # [{id, question, expected_answer, marks, hints}]
    student_answers: list[dict]  # [{question_id, answer}]


class EvaluateResponse(BaseModel):
    results: list[dict]
    total_score: int
    total_marks: int
    percentage: float
    grade: str
    passed: bool
    overall_feedback: str


# ─── File text extraction ──────────────────────────────────────────────────────


def _extract_text(file: UploadFile) -> str:
    content = file.file.read()
    name = (file.filename or "").lower()
    if name.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    if name.endswith(".docx"):
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="replace")


# ─── Routes ───────────────────────────────────────────────────────────────────


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    instructions: str = Form(...),
    num_questions: int = Form(5),
    marks_per_question: int = Form(10),
    file: UploadFile | None = File(None),
):
    """
    Generate open-ended voice assessment questions from teacher instructions
    and/or an uploaded document (PDF, DOCX, TXT).
    """
    if not instructions.strip() and (not file or not file.filename):
        raise HTTPException(
            status_code=400,
            detail="Provide instructions text and/or an uploaded document.",
        )

    file_content: str | None = None
    if file and file.filename:
        try:
            file_content = _extract_text(file)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not read file: {exc}")

    try:
        questions = await generate_voice_questions(
            instructions=instructions,
            num_questions=max(1, min(num_questions, 20)),
            marks_per_question=max(1, marks_per_question),
            file_content=file_content,
        )
        return GenerateResponse(questions=questions)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {exc}") from exc


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(body: EvaluateRequest):
    """
    Evaluate a student's voice/text answers against the expected answers.
    Returns per-question scores, feedback, total score, grade, and pass/fail.
    """
    if not body.questions:
        raise HTTPException(status_code=400, detail="Questions list cannot be empty.")
    if not body.student_answers:
        raise HTTPException(status_code=400, detail="Student answers cannot be empty.")

    try:
        result = await evaluate_student_answers(
            questions=body.questions,
            student_answers=body.student_answers,
        )
        return EvaluateResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {exc}") from exc
