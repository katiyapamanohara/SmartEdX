"""Reusable agent instruction blocks.

Import individual rule constants or use ``all_instructions`` to get them
concatenated in the recommended order.
"""

from app.agent.instructions.call_rules import CALL_RULES
from app.agent.instructions.language_rules import LANGUAGE_RULES
from app.agent.instructions.sinhala_rules import SINHALA_NUMBER_PRONUNCIATION_RULES
from app.agent.instructions.speech_clarity_rules import SPEECH_CLARITY_RULES

all_instructions = CALL_RULES + LANGUAGE_RULES + SPEECH_CLARITY_RULES + SINHALA_NUMBER_PRONUNCIATION_RULES

__all__ = [
    "CALL_RULES",
    "LANGUAGE_RULES",
    "SINHALA_NUMBER_PRONUNCIATION_RULES",
    "SPEECH_CLARITY_RULES",
    "all_instructions",
]
