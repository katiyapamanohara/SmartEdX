"""SmartEdX Facial Recognition Server — DeepFace-powered face enrollment and verification."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.face import router as face_router

app = FastAPI(
    title="SmartEdX Facial Recognition",
    description="Face enrollment and verification service using DeepFace",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(face_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": settings.FACE_MODEL,
        "detector": settings.DETECTOR_BACKEND,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
