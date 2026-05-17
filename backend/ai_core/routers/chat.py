"""Institute AI Assistant — chat router."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.institute_assistant import ActionTracker, chat_with_assistant

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class InstituteContext(BaseModel):
    institute_name: str | None = None
    student_count:  int | None = None
    teacher_count:  int | None = None
    course_count:   int | None = None


class ChatRequest(BaseModel):
    messages:     list[ChatMessage]
    institute_id: str
    context:      InstituteContext | None = None
    # Forward the owner's auth token so tools can call the institute service
    auth_token:   str | None = None


class ChatResponse(BaseModel):
    reply:   str
    # Side-effects produced by tool calls (e.g. a course that was just created)
    actions: list[dict] = []


# ─── Endpoint ─────────────────────────────────────────────────────────────────


@router.post("/message", response_model=ChatResponse)
async def chat(body: ChatRequest):
    """
    Send a message to the institute AI assistant.

    The assistant has live access to institute data (analytics, courses) via
    the institute service API, and can create courses on the owner's behalf.
    Side-effects (created courses, etc.) are returned in the `actions` field.
    """
    if not body.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty.")

    last = body.messages[-1]
    if last.role != "user" or not last.content.strip():
        raise HTTPException(status_code=400, detail="Last message must be a non-empty user message.")

    try:
        context_dict  = body.context.model_dump(exclude_none=True) if body.context else {}
        messages_list = [{"role": m.role, "content": m.content} for m in body.messages]
        tracker       = ActionTracker()

        reply = await chat_with_assistant(
            messages=messages_list,
            institute_context=context_dict,
            institute_id=body.institute_id,
            auth_token=body.auth_token,
            tracker=tracker,
        )

        actions: list[dict] = [
            {"type": "course_created", "data": c}
            for c in tracker.created_courses
        ] + [
            {"type": "lecturer_invited", "data": u}
            for u in tracker.invited_lecturers
        ]

        return ChatResponse(reply=reply, actions=actions)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI assistant error: {exc}") from exc
