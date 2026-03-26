"""Voice Assessment Agent — generates open-ended questions and evaluates student answers."""

from __future__ import annotations

import json
import re

from agno.agent import Agent

from config import settings


# ─── Model factory ────────────────────────────────────────────────────────────


def _make_model():
    if settings.AI_PROVIDER == "openai":
        from agno.models.openai import OpenAIChat
        return OpenAIChat(id=settings.MODEL_ID, api_key=settings.OPENAI_API_KEY)
    if settings.AI_PROVIDER == "gemini":
        from agno.models.google import Gemini
        return Gemini(id=settings.MODEL_ID, api_key=settings.GOOGLE_API_KEY)
    from agno.models.anthropic import Claude
    return Claude(id=settings.MODEL_ID, api_key=settings.ANTHROPIC_API_KEY)


# ─── Question generation ───────────────────────────────────────────────────────


async def generate_voice_questions(
    instructions: str,
    num_questions: int = 5,
    marks_per_question: int = 10,
    file_content: str | None = None,
) -> list[dict]:
    """
    Generate open-ended voice assessment questions from teacher instructions
    and/or an uploaded document.

    Returns a list of dicts:
      {id, question, expected_answer, marks, hints}
    """
    context = instructions.strip()
    if file_content:
        context += f"\n\nDOCUMENT CONTENT:\n{file_content[:4000]}"

    prompt = f"""You are an expert educational assessment designer.

Based on the following teacher instructions and/or document, generate exactly {num_questions} open-ended
voice assessment questions. These questions will be asked aloud to students who must answer verbally.

INSTRUCTIONS / DOCUMENT:
{context}

Requirements:
- Questions must test genuine understanding, not just recall
- Each question should be answerable in 1–3 sentences verbally
- Include a detailed expected_answer (key points that must be covered)
- Include 2 short hint keywords to guide the student if they're stuck
- Assign {marks_per_question} marks per question
- Questions should progress from easier to harder

Respond with ONLY valid JSON (no markdown, no explanation), in this exact format:
[
  {{
    "id": "q1",
    "question": "...",
    "expected_answer": "...",
    "marks": {marks_per_question},
    "hints": ["hint1", "hint2"]
  }},
  ...
]"""

    agent = Agent(
        model=_make_model(),
        description="You are an expert educational assessment designer. You only output valid JSON.",
    )
    result = await agent.arun(prompt)
    raw = result.content if isinstance(result.content, str) else str(result.content)

    # Strip markdown fences if present
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()

    try:
        questions = json.loads(raw)
        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array")
        return questions
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(f"AI returned invalid JSON: {exc}\nRaw output:\n{raw[:500]}") from exc


# ─── Answer evaluation ────────────────────────────────────────────────────────


async def evaluate_student_answers(
    questions: list[dict],
    student_answers: list[dict],
) -> dict:
    """
    Evaluate all student voice answers against the expected answers.

    questions: [{id, question, expected_answer, marks, hints}, ...]
    student_answers: [{question_id, answer}, ...]

    Returns:
      {
        results: [{question_id, question, student_answer, score, marks_available, feedback, percentage}, ...],
        total_score: int,
        total_marks: int,
        percentage: float,
        grade: str,
        passed: bool,
        overall_feedback: str
      }
    """
    answer_map = {a["question_id"]: a["answer"] for a in student_answers}

    eval_items = []
    for q in questions:
        student_ans = answer_map.get(q["id"], "").strip()
        eval_items.append(
            f'Q{q["id"]}: "{q["question"]}"\n'
            f'  Expected key points: "{q["expected_answer"]}"\n'
            f'  Student answered: "{student_ans or "(no answer given)"}"\n'
            f'  Max marks: {q["marks"]}'
        )

    prompt = f"""You are a fair and encouraging educational examiner evaluating a student's voice assessment.

For each question below, score the student's verbal answer out of the maximum marks.
Be generous with partial credit if the student shows understanding even if wording isn't perfect.
A spoken answer doesn't need to be perfect — reward understanding over exact phrasing.

{chr(10).join(eval_items)}

Respond with ONLY valid JSON (no markdown), exactly like this:
{{
  "results": [
    {{
      "question_id": "q1",
      "score": 8,
      "feedback": "Good understanding of the core concept. You could also mention..."
    }},
    ...
  ],
  "overall_feedback": "Overall you demonstrated..."
}}"""

    agent = Agent(
        model=_make_model(),
        description="You are a fair educational examiner. You only output valid JSON.",
    )
    result = await agent.arun(prompt)
    raw = result.content if isinstance(result.content, str) else str(result.content)
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()

    try:
        evaluation = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"AI returned invalid JSON: {exc}\nRaw:\n{raw[:500]}") from exc

    # Merge with question data for full result
    q_map = {q["id"]: q for q in questions}
    results = []
    total_score = 0
    total_marks = 0

    for r in evaluation.get("results", []):
        qid = r["question_id"]
        q = q_map.get(qid, {})
        marks_available = q.get("marks", 10)
        score = min(int(r.get("score", 0)), marks_available)
        total_score += score
        total_marks += marks_available
        results.append({
            "question_id":     qid,
            "question":        q.get("question", ""),
            "student_answer":  answer_map.get(qid, ""),
            "expected_answer": q.get("expected_answer", ""),
            "score":           score,
            "marks_available": marks_available,
            "percentage":      round(score / marks_available * 100) if marks_available else 0,
            "feedback":        r.get("feedback", ""),
        })

    percentage = round(total_score / total_marks * 100) if total_marks else 0
    passed = percentage >= 50

    if percentage >= 90:   grade = "A+"
    elif percentage >= 80: grade = "A"
    elif percentage >= 70: grade = "B"
    elif percentage >= 60: grade = "C"
    elif percentage >= 50: grade = "D"
    else:                  grade = "F"

    return {
        "results":          results,
        "total_score":      total_score,
        "total_marks":      total_marks,
        "percentage":       percentage,
        "grade":            grade,
        "passed":           passed,
        "overall_feedback": evaluation.get("overall_feedback", "Assessment completed."),
    }
