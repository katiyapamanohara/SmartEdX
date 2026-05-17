"""Student AI Assistant — chat router with file upload support."""

import io
import json

import pdfplumber
from docx import Document
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.student_assistant import chat_with_student_assistant

router = APIRouter(prefix="/api/student-chat", tags=["student-chat"])


# ─── Schema ───────────────────────────────────────────────────────────────────


class StudentChatResponse(BaseModel):
    reply: str
    actions: list[dict] = []


# ─── File text extraction ──────────────────────────────────────────────────────


def _extract_text(file: UploadFile) -> str:
    content = file.file.read()
    name = (file.filename or "").lower()

    if name.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
        return "\n".join(pages)

    if name.endswith(".docx"):
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="replace")


# ─── Endpoint ─────────────────────────────────────────────────────────────────


@router.post("/message", response_model=StudentChatResponse)
async def student_chat(
    messages: str = Form(...),
    institute_id: str = Form(...),
    student_id: str = Form(...),
    context: str = Form("{}"),
    auth_token: str = Form(""),
    course_id: str = Form(""),
    file: UploadFile | None = File(None),
):
    """
    Send a message to the Student AI learning assistant.

    Supports optional file upload (PDF, DOCX, TXT) so the student can
    ask questions about their notes, assignments, or reading materials.

    Form fields:
      - messages:     JSON array of {role, content} objects
      - institute_id: Institute identifier
      - student_id:   Student user ID
      - context:      JSON object with student context (optional)
      - auth_token:   Bearer token for live API calls (optional)
      - file:         Uploaded file (optional)
    """
    try:
        messages_list: list[dict] = json.loads(messages)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in 'messages' field.")

    try:
        context_dict: dict = json.loads(context)
    except json.JSONDecodeError:
        context_dict = {}

    if not messages_list:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    last = messages_list[-1]
    if last.get("role") != "user" or not str(last.get("content", "")).strip():
        raise HTTPException(status_code=400, detail="Last message must be a non-empty user message.")

    file_content: str | None = None
    if file and file.filename:
        try:
            file_content = _extract_text(file)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not read uploaded file: {exc}")

    # course_id may come as a top-level form field or embedded in context JSON
    effective_course_id = course_id or context_dict.get("course_id") or None

    try:
        reply = await chat_with_student_assistant(
            messages=messages_list,
            student_context=context_dict,
            institute_id=institute_id,
            student_id=student_id,
            auth_token=auth_token or None,
            file_content=file_content,
            course_id=effective_course_id,
        )
        return StudentChatResponse(reply=reply)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Student AI assistant error: {exc}") from exc
