"""Screen content monitoring — detect academic dishonesty in screenshots."""

from __future__ import annotations

import base64
import json
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api/screen", tags=["screen"])
logger = logging.getLogger(__name__)

# ─── Prompt ──────────────────────────────────────────────────────────────────

_CHEAT_PROMPT = """You are an academic integrity monitor analyzing a student's screen during an online exam.

Examine this screenshot carefully and determine if the student is engaged in academic dishonesty.

Flag as SUSPICIOUS if you see ANY of the following:

DESKTOP AI APPLICATIONS (very common cheating method — look carefully):
- ChatGPT desktop app (Mac or Windows) — dark interface with conversation bubbles
- Claude for Desktop — Anthropic's desktop app with chat interface
- Microsoft Copilot app or sidebar
- Google Gemini app
- Any native desktop chat/AI application window

BROWSER-BASED AI & CHEATING RESOURCES:
- ChatGPT (chat.openai.com), Claude (claude.ai), Gemini, Perplexity, or any AI chat in a browser
- Search engines (Google, Bing, DuckDuckGo) with search queries visible in the URL or search box
- Answer/homework sites: Chegg, Course Hero, Quizlet, Brainly, Studocu, Bartleby
- Q&A forums: Stack Overflow, Reddit, Yahoo Answers showing question/answer content
- Messaging apps asking for help: WhatsApp Web, Telegram Web, Discord, Slack

OTHER SUSPICIOUS CONTENT:
- Notes, documents, spreadsheets containing exam answers or course material
- Browser developer tools (F12 / DevTools panel)
- Multiple browser windows or tabs visible simultaneously
- A desktop showing an application that is NOT the exam browser
- Any AI assistant sidebar embedded in the browser

Do NOT flag:
- The exam interface itself (quiz/exam questions and answer fields)
- A blank desktop, wallpaper, or screensaver with no suspicious apps visible
- System clock, calendar, or innocent system notifications

Be aggressive — if you see ANY AI app, chat window, or reference material, mark it suspicious.

Respond ONLY with valid JSON — no markdown, no extra text:
{"suspicious": true, "reason": "brief description of what you see"}
or
{"suspicious": false, "reason": "screen shows only the exam interface"}"""


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _strip_data_url_prefix(image_b64: str) -> tuple[str, str]:
    """Strip data:image/...;base64, prefix and return (raw_b64, media_type)."""
    if image_b64.startswith("data:"):
        header, data = image_b64.split(",", 1)
        media_type = header.split(":")[1].split(";")[0]
        return data, media_type
    return image_b64, "image/jpeg"


async def _analyze_anthropic(image_b64: str, media_type: str) -> dict:
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = await client.messages.create(
        model=settings.MODEL_ID,
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": _CHEAT_PROMPT},
                ],
            }
        ],
    )
    raw = message.content[0].text.strip()
    return json.loads(raw)


async def _analyze_gemini(image_b64: str, media_type: str) -> dict:
    import google.generativeai as genai  # type: ignore
    genai.configure(api_key=settings.GOOGLE_API_KEY)
    model = genai.GenerativeModel(settings.MODEL_ID)
    image_bytes = base64.b64decode(image_b64)
    response = await model.generate_content_async(
        [{"mime_type": media_type, "data": image_bytes}, _CHEAT_PROMPT],
        generation_config={"max_output_tokens": 200, "temperature": 0},
    )
    raw = response.text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(raw)


async def _analyze_openai(image_b64: str, media_type: str) -> dict:
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    response = await client.chat.completions.create(
        model=settings.MODEL_ID,
        max_tokens=200,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_b64}",
                            "detail": "low",
                        },
                    },
                    {"type": "text", "text": _CHEAT_PROMPT},
                ],
            }
        ],
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


# ─── Request / response models ────────────────────────────────────────────────

class ScreenAnalysisRequest(BaseModel):
    image_b64: str  # raw base64 or data URL


class ScreenAnalysisResult(BaseModel):
    suspicious: bool
    reason: str


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/analyze", response_model=ScreenAnalysisResult)
async def analyze_screen(body: ScreenAnalysisRequest):
    """
    Analyze a student's screen screenshot for academic dishonesty.
    Returns { suspicious: bool, reason: str }.
    """
    raw_b64, media_type = _strip_data_url_prefix(body.image_b64)

    try:
        if settings.AI_PROVIDER == "gemini":
            result = await _analyze_gemini(raw_b64, media_type)
        elif settings.AI_PROVIDER == "openai":
            result = await _analyze_openai(raw_b64, media_type)
        else:
            result = await _analyze_anthropic(raw_b64, media_type)
    except json.JSONDecodeError as exc:
        logger.warning("AI returned non-JSON for screen analysis: %s", exc)
        # Treat parse failure as not suspicious (conservative)
        return ScreenAnalysisResult(suspicious=False, reason="Analysis inconclusive")
    except Exception as exc:
        logger.error("Screen analysis error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Screen analysis failed: {exc}")

    return ScreenAnalysisResult(
        suspicious=bool(result.get("suspicious", False)),
        reason=str(result.get("reason", "")),
    )
