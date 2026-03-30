"""Voice-to-text transcription using Google Gemini (auto-detects any language)."""

import base64
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcription", tags=["transcription"])

_SUPPORTED_MIME_TYPES = {
    "audio/webm", "video/webm",
    "audio/ogg",
    "audio/wav", "audio/wave",
    "audio/mp3", "audio/mpeg",
    "audio/mp4", "audio/aac",
    "audio/flac",
}


class TranscriptionResponse(BaseModel):
    transcript: str


def _resolve_mime(file: UploadFile) -> str:
    mime = (file.content_type or "").lower().split(";")[0].strip()
    if mime in _SUPPORTED_MIME_TYPES:
        return mime
    name = (file.filename or "").lower()
    if name.endswith(".webm"): return "audio/webm"
    if name.endswith(".ogg"):  return "audio/ogg"
    if name.endswith(".wav"):  return "audio/wav"
    if name.endswith(".mp3"):  return "audio/mp3"
    if name.endswith(".m4a") or name.endswith(".mp4"): return "audio/mp4"
    if name.endswith(".aac"):  return "audio/aac"
    if name.endswith(".flac"): return "audio/flac"
    return "audio/webm"


@router.post("/audio", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using Google Gemini.
    Automatically detects any language — no language code required.
    """
    if not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY is not configured.")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    mime_type = _resolve_mime(audio)
    logger.info("Transcribing %d bytes (%s)", len(audio_bytes), mime_type)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GOOGLE_API_KEY)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Content(parts=[
                    types.Part(inline_data=types.Blob(
                        mime_type=mime_type,
                        data=base64.b64encode(audio_bytes).decode(),
                    )),
                    types.Part(text=(
                        "Transcribe every word spoken in this audio exactly as heard, "
                        "in whatever language is being spoken. "
                        "Return only the transcribed text with no labels, translations, or commentary."
                    )),
                ])
            ],
        )

        transcript = (response.text or "").strip()
        logger.info("Transcription done: %d chars", len(transcript))
        return TranscriptionResponse(transcript=transcript)

    except Exception as exc:
        logger.error("Transcription failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
