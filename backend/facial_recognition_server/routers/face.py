"""Face enrollment and verification endpoints."""

from __future__ import annotations

import base64
import io
import logging
from typing import Optional

import numpy as np
from deepface import DeepFace
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/face", tags=["face"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _decode_image(data: bytes) -> np.ndarray:
    """Decode raw image bytes → numpy RGB array."""
    import cv2
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


def _extract_descriptor(img: np.ndarray) -> list[float]:
    """Run DeepFace embedding extraction. Returns 512-d (Facenet512) vector."""
    result = DeepFace.represent(
        img_path=img,
        model_name=settings.FACE_MODEL,
        detector_backend=settings.DETECTOR_BACKEND,
        enforce_detection=True,
        align=True,
    )
    if not result:
        raise ValueError("No face detected in the image")
    # result is a list of dicts; take the highest-confidence face
    best = max(result, key=lambda r: r.get("face_confidence", 0))
    return best["embedding"]


def _cosine_distance(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float64)
    vb = np.array(b, dtype=np.float64)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 1.0
    return float(1.0 - np.dot(va, vb) / (norm_a * norm_b))


# ─── Schemas ──────────────────────────────────────────────────────────────────

class EnrollResponse(BaseModel):
    descriptor: list[float]
    model: str
    dimensions: int


class VerifyRequest(BaseModel):
    descriptor_stored: list[float]   # retrieved from DB by the caller
    descriptor_probe: list[float]    # from the live capture


class VerifyResponse(BaseModel):
    verified: bool
    distance: float
    threshold: float


class VerifyImageRequest(BaseModel):
    descriptor_stored: list[float]
    image_b64: str   # base64-encoded JPEG/PNG from webcam


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/enroll", response_model=EnrollResponse)
async def enroll_face(
    file: UploadFile = File(..., description="JPEG or PNG image of the student's face"),
):
    """
    Upload a face image; returns the 512-d embedding descriptor.
    The caller stores this descriptor in the student record.
    """
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        img = _decode_image(raw)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        descriptor = _extract_descriptor(img)
    except Exception as e:
        msg = str(e)
        if "Face could not be detected" in msg or "No face detected" in msg:
            raise HTTPException(
                status_code=422,
                detail="No face detected. Please use a clear, well-lit photo facing the camera.",
            )
        logger.exception("DeepFace enrollment error")
        raise HTTPException(status_code=500, detail=f"Face extraction failed: {msg}")

    return EnrollResponse(
        descriptor=descriptor,
        model=settings.FACE_MODEL,
        dimensions=len(descriptor),
    )


@router.post("/enroll-base64", response_model=EnrollResponse)
async def enroll_face_base64(
    image_b64: str = Form(..., description="Base64-encoded JPEG/PNG image"),
):
    """
    Same as /enroll but accepts a base64 string (from a webcam capture).
    """
    try:
        raw = base64.b64decode(image_b64.split(",")[-1])  # strip data:image/... prefix
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid base64 image data.")

    try:
        img = _decode_image(raw)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        descriptor = _extract_descriptor(img)
    except Exception as e:
        msg = str(e)
        if "Face could not be detected" in msg or "No face detected" in msg:
            raise HTTPException(
                status_code=422,
                detail="No face detected. Please use a clear, well-lit photo facing the camera.",
            )
        logger.exception("DeepFace enrollment error")
        raise HTTPException(status_code=500, detail=f"Face extraction failed: {msg}")

    return EnrollResponse(
        descriptor=descriptor,
        model=settings.FACE_MODEL,
        dimensions=len(descriptor),
    )


@router.post("/verify", response_model=VerifyResponse)
async def verify_descriptors(body: VerifyRequest):
    """
    Compare two pre-computed descriptors.
    Returns verified=True if cosine distance < threshold.
    """
    dist = _cosine_distance(body.descriptor_stored, body.descriptor_probe)
    return VerifyResponse(
        verified=dist < settings.DISTANCE_THRESHOLD,
        distance=round(dist, 6),
        threshold=settings.DISTANCE_THRESHOLD,
    )


@router.post("/verify-image", response_model=VerifyResponse)
async def verify_image(body: VerifyImageRequest):
    """
    Compare a stored descriptor against a live webcam frame (base64).
    Extracts a fresh descriptor from the image then runs cosine comparison.
    """
    try:
        raw = base64.b64decode(body.image_b64.split(",")[-1])
        img = _decode_image(raw)
        probe_descriptor = _extract_descriptor(img)
    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if "Face could not be detected" in msg or "No face detected" in msg:
            raise HTTPException(
                status_code=422,
                detail="No face detected in verification image.",
            )
        raise HTTPException(status_code=500, detail=f"Verification failed: {msg}")

    dist = _cosine_distance(body.descriptor_stored, probe_descriptor)
    return VerifyResponse(
        verified=dist < settings.DISTANCE_THRESHOLD,
        distance=round(dist, 6),
        threshold=settings.DISTANCE_THRESHOLD,
    )
