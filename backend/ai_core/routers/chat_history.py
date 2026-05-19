"""Chat history endpoints — save and load per-user, per-course message history."""

import json
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.chat_history import save_messages, load_messages, clear_history

router = APIRouter(prefix="/api/ai/chat-history", tags=["chat-history"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class MessageIn(BaseModel):
    role: str
    content: str
    timestamp: float | None = None


class SaveRequest(BaseModel):
    institute_id: str
    user_id: str
    user_type: Literal["student", "teacher"]
    course_id: str
    messages: list[MessageIn]


class HistoryMessage(BaseModel):
    role: str
    content: str
    timestamp: float


class LoadResponse(BaseModel):
    messages: list[HistoryMessage]


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/save", status_code=204)
async def save_history(body: SaveRequest) -> None:
    """Upsert a batch of messages into the user's chat history."""
    if not body.messages:
        return
    save_messages(
        institute_id=body.institute_id,
        user_id=body.user_id,
        user_type=body.user_type,
        course_id=body.course_id,
        messages=[m.model_dump() for m in body.messages],
    )


@router.get("/load", response_model=LoadResponse)
async def get_history(
    institute_id: str,
    user_id: str,
    course_id: str,
) -> LoadResponse:
    """Return the saved message history for a user + course."""
    msgs = load_messages(
        institute_id=institute_id,
        user_id=user_id,
        course_id=course_id,
    )
    return LoadResponse(messages=[HistoryMessage(**m) for m in msgs])


@router.delete("/clear", status_code=204)
async def delete_history(
    institute_id: str,
    user_id: str,
    course_id: str,
) -> None:
    """Clear all saved history for a user + course."""
    clear_history(institute_id=institute_id, user_id=user_id, course_id=course_id)
