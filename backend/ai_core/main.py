"""SmartEdX AI Core — Agno-powered quiz generation service."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.quiz import router as quiz_router
from routers.description import router as description_router
from routers.chat import router as chat_router
from routers.teacher_chat import router as teacher_chat_router
from routers.student_chat import router as student_chat_router
from routers.voice_assessment import router as voice_assessment_router
from routers.transcription import router as transcription_router
from routers.teacher_tools import router as teacher_tools_router
from routers.teacher_tools import router_ai_tools
from routers.screen_monitor import router as screen_monitor_router
from routers.chat_history import router as chat_history_router
from routers.chat_sessions import router as chat_sessions_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    from utils.qdrant_search import warmup_embedding_model
    warmup_embedding_model()
    yield


app = FastAPI(
    title="SmartEdX AI Core",
    description="AI-powered quiz generation and institute assistant using Agno framework",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if settings.cors_allow_all else settings.cors_origin_list,
    allow_origin_regex=".*" if settings.cors_allow_all else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quiz_router)
app.include_router(description_router)
app.include_router(chat_router)
app.include_router(teacher_chat_router)
app.include_router(student_chat_router)
app.include_router(voice_assessment_router)
app.include_router(transcription_router)
app.include_router(teacher_tools_router)
app.include_router(router_ai_tools)
app.include_router(screen_monitor_router)
app.include_router(chat_history_router)
app.include_router(chat_sessions_router)


@app.get("/health")
def health():
    return {"status": "ok", "provider": settings.AI_PROVIDER, "model": settings.MODEL_ID}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
