"""Teacher AI Assistant — chat router with file upload support."""

import io
import json

import pdfplumber
from docx import Document
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from agents.teacher_assistant import TeacherActionTracker, chat_with_teacher_assistant

router = APIRouter(prefix="/api/teacher-chat", tags=["teacher-chat"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class TeacherChatResponse(BaseModel):
    reply: str
    actions: list[dict] = []


# ─── File text extraction ──────────────────────────────────────────────────────


def _extract_text(file: UploadFile) -> str:
    """Extract plain text from an uploaded PDF, DOCX, or plain-text file."""
    content = file.file.read()
    name = (file.filename or "").lower()

    if name.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
        return "\n".join(pages)

    if name.endswith(".docx"):
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    # Plain text / CSV / etc.
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="replace")


# ─── Endpoint ─────────────────────────────────────────────────────────────────


@router.post("/message", response_model=TeacherChatResponse)
async def teacher_chat(
    messages: str = Form(...),
    institute_id: str = Form(...),
    teacher_id: str = Form(...),
    context: str = Form("{}"),
    auth_token: str = Form(""),
    file: UploadFile | None = File(None),
):
    """
    Send a message to the Teacher AI assistant.

    Supports optional file upload (PDF, DOCX, TXT). File content is extracted
    and passed as context so the AI can analyse it alongside the chat message.

    Form fields:
      - messages:     JSON array of {role, content} objects
      - institute_id: Institute identifier
      - teacher_id:   Teacher user ID
      - context:      JSON object with teacher context (optional)
      - auth_token:   Bearer token for live API calls (optional)
      - file:         Uploaded file (optional)
    """
    # ── Parse form fields ─────────────────────────────────────────────────────
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

    # ── Extract file text ─────────────────────────────────────────────────────
    file_content: str | None = None
    if file and file.filename:
        try:
            file_content = _extract_text(file)
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Could not read uploaded file: {exc}",
            )

    # ── Run agent ─────────────────────────────────────────────────────────────
    try:
        tracker = TeacherActionTracker()

        reply = await chat_with_teacher_assistant(
            messages=messages_list,
            teacher_context=context_dict,
            institute_id=institute_id,
            teacher_id=teacher_id,
            auth_token=auth_token or None,
            tracker=tracker,
            file_content=file_content,
        )

        actions: list[dict] = [
            {"type": "content_generated", "data": item}
            for item in tracker.generated_content
        ]

        return TeacherChatResponse(reply=reply, actions=actions)

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Teacher AI assistant error: {exc}",
        ) from exc
