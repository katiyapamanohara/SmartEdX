"""SmartEdX AI Core — Agno-powered quiz generation service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.quiz import router as quiz_router

app = FastAPI(
    title="SmartEdX AI Core",
    description="AI-powered quiz generation using Agno framework",
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


@app.get("/health")
def health():
    return {"status": "ok", "provider": settings.AI_PROVIDER, "model": settings.MODEL_ID}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
