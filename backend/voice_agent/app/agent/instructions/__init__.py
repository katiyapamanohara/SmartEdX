"""Reusable agent instruction blocks.

Import individual rule constants or use ``all_instructions`` to get them
concatenated in the recommended order.
"""

from app.agent.instructions.call_rules import CALL_RULES
from app.agent.instructions.education_scope_rules import EDUCATION_SCOPE_RULES
from app.agent.instructions.language_rules import LANGUAGE_RULES
from app.agent.instructions.sinhala_rules import SINHALA_NUMBER_PRONUNCIATION_RULES
from app.agent.instructions.speech_clarity_rules import SPEECH_CLARITY_RULES
from app.config import SINHALA_RULES_ENABLED

all_instructions = (
    EDUCATION_SCOPE_RULES
    + CALL_RULES
    + LANGUAGE_RULES
    + SPEECH_CLARITY_RULES
    + (SINHALA_NUMBER_PRONUNCIATION_RULES if SINHALA_RULES_ENABLED else "")
)

__all__ = [
    "CALL_RULES",
    "EDUCATION_SCOPE_RULES",
    "LANGUAGE_RULES",
    "SINHALA_NUMBER_PRONUNCIATION_RULES",
    "SPEECH_CLARITY_RULES",
    "all_instructions",
]
