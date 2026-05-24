"""Chat session management — per-chat Qdrant collections.

Collection naming: chat_{inst8}_{course8}_{user8}_{role}_{chat_id}
Index collection:  chat_idx_{inst8}_{user8}
"""

from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.chat_sessions import (
    create_chat,
    list_chats,
    delete_chat,
    rename_chat,
    save_messages,
    load_messages,
    get_msg_collection_name,
)

router = APIRouter(prefix="/chat-sessions", tags=["chat-sessions"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CreateChatRequest(BaseModel):
    institute_id: str
    course_id: str
    user_id: str
    role: Literal["student", "teacher"]
    title: str = "New Chat"


class ChatMeta(BaseModel):
    chat_id: str
    course_id: str
    role: str
    title: str
    created_at: float
    updated_at: float
    message_count: int
    msg_collection: str


class MessageIn(BaseModel):
    role: str
    content: str
    timestamp: float | None = None


class SaveMessagesRequest(BaseModel):
    institute_id: str
    course_id: str
    user_id: str
    role: str
    chat_id: str
    messages: list[MessageIn]


class LoadResponse(BaseModel):
    messages: list[dict]


class RenameRequest(BaseModel):
    institute_id: str
    user_id: str
    course_id: str
    role: str
    chat_id: str
    title: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/create", response_model=ChatMeta)
async def create(body: CreateChatRequest) -> ChatMeta:
    """Create a new chat session and its Qdrant message collection."""
    meta = create_chat(
        institute_id=body.institute_id,
        course_id=body.course_id,
        user_id=body.user_id,
        role=body.role,
        title=body.title,
    )
    return ChatMeta(**meta)


@router.get("/list", response_model=list[ChatMeta])
async def list_user_chats(
    institute_id: str,
    user_id: str,
    course_id: str,
    role: str,
) -> list[ChatMeta]:
    """Return all chats for a user + course + role, newest first."""
    chats = list_chats(
        institute_id=institute_id,
        user_id=user_id,
        course_id=course_id,
        role=role,
    )
    return [ChatMeta(**c) for c in chats]


@router.delete("/delete", status_code=204)
async def delete(
    institute_id: str,
    user_id: str,
    course_id: str,
    role: str,
    chat_id: str,
) -> None:
    """Delete a chat and its Qdrant message collection."""
    delete_chat(
        institute_id=institute_id,
        user_id=user_id,
        course_id=course_id,
        role=role,
        chat_id=chat_id,
    )


@router.post("/rename", status_code=204)
async def rename(body: RenameRequest) -> None:
    """Rename a chat session."""
    rename_chat(
        institute_id=body.institute_id,
        user_id=body.user_id,
        course_id=body.course_id,
        role=body.role,
        chat_id=body.chat_id,
        title=body.title,
    )


@router.post("/messages/save", status_code=204)
async def save(body: SaveMessagesRequest) -> None:
    """Upsert messages into the chat's Qdrant collection."""
    save_messages(
        institute_id=body.institute_id,
        course_id=body.course_id,
        user_id=body.user_id,
        role=body.role,
        chat_id=body.chat_id,
        messages=[m.model_dump(exclude_none=True) for m in body.messages],
    )


@router.get("/messages/load", response_model=LoadResponse)
async def load(
    institute_id: str,
    course_id: str,
    user_id: str,
    role: str,
    chat_id: str,
) -> LoadResponse:
    """Load all messages for a chat session, oldest first."""
    msgs = load_messages(
        institute_id=institute_id,
        course_id=course_id,
        user_id=user_id,
        role=role,
        chat_id=chat_id,
    )
    return LoadResponse(messages=msgs)


@router.get("/collection-name")
async def collection_name(
    institute_id: str,
    course_id: str,
    user_id: str,
    role: str,
    chat_id: str,
) -> dict:
    """Return the Qdrant collection name for a chat (used by voice agent)."""
    return {
        "collection": get_msg_collection_name(
            institute_id=institute_id,
            course_id=course_id,
            user_id=user_id,
            role=role,
            chat_id=chat_id,
        )
    }
