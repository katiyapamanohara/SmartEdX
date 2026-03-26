"""SmartEdX AI Core — Agno-powered quiz generation service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.quiz import router as quiz_router
from routers.description import router as description_router
from routers.chat import router as chat_router
from routers.teacher_chat import router as teacher_chat_router
from routers.student_chat import router as student_chat_router

app = FastAPI(
    title="SmartEdX AI Core",
    description="AI-powered quiz generation and institute assistant using Agno framework",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quiz_router)
app.include_router(description_router)
app.include_router(chat_router)
app.include_router(teacher_chat_router)
app.include_router(student_chat_router)


@app.get("/health")
def health():
    return {"status": "ok", "provider": settings.AI_PROVIDER, "model": settings.MODEL_ID}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
