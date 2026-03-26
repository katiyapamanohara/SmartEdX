"""SmartEdX voice assessment tool — evaluates student answers via ai_core."""

import json
import logging

import httpx
from google.adk.tools import ToolContext

from app.config import AI_CORE_URL

logger = logging.getLogger(__name__)


def evaluate_voice_assessment(tool_context: ToolContext, questions_and_answers_json: str) -> dict:
    """Evaluate a student's voice assessment answers. Call this ONLY when the student
    has verbally answered ALL questions in the assessment.

    questions_and_answers_json: JSON string in this exact format:
    {
      "questions": [
        {"id": "q1", "question": "...", "expected_answer": "...", "marks": 10, "hints": []}
      ],
      "student_answers": [
        {"question_id": "q1", "answer": "student's spoken answer"}
      ]
    }

    Returns the evaluation result with scores, feedback, grade, and pass/fail status.
    """
    try:
        payload = json.loads(questions_and_answers_json)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in evaluate_voice_assessment: {e}")
        return {"error": "Invalid JSON format for questions_and_answers_json."}

    questions = payload.get("questions", [])
    student_answers = payload.get("student_answers", [])

    if not questions:
        return {"error": "No questions provided for evaluation."}
    if not student_answers:
        return {"error": "No student answers provided for evaluation."}

    try:
        resp = httpx.post(
            f"{AI_CORE_URL}/api/voice-assessment/evaluate",
            json={"questions": questions, "student_answers": student_answers},
            timeout=60.0,
        )
        resp.raise_for_status()
        result = resp.json()
        logger.info(
            f"Assessment evaluated: {result.get('total_score')}/{result.get('total_marks')} "
            f"({result.get('percentage')}%) grade={result.get('grade')}"
        )
        return result
    except httpx.HTTPStatusError as e:
        logger.error(f"ai_core evaluation HTTP error {e.response.status_code}: {e}")
        return {"error": f"Evaluation service returned {e.response.status_code}."}
    except Exception as e:
        logger.error(f"evaluate_voice_assessment failed: {e}", exc_info=True)
        return {"error": f"Evaluation service unavailable: {e}"}
