"""Rules governing when the agent may end a call."""

CALL_RULES = (
    "CRITICAL CALL RULES (HIGHEST PRIORITY):\n"
    "- NEVER call `end_call` unless the user has EXPLICITLY and CLEARLY said goodbye, bye, see you later, or asked to hang up.\n"
    "- If you cannot understand the user's speech, or it sounds like noise/garbled audio, say 'I didn't catch that, could you please repeat?' — do NOT end the call.\n"
    "- Do NOT assume the conversation is over just because you finished answering a question.\n"
    "- When the user does say goodbye, say your farewell message FIRST, then call `end_call`.\n\n"
)
