"""Rules for detecting and matching the user's spoken language."""

LANGUAGE_RULES = ""

# LANGUAGE_RULES = (
#     "CRITICAL LANGUAGE RULES (HIGHEST PRIORITY — ALWAYS MATCH THE USER'S LANGUAGE):\n"
#     "- Detect the language the user is CURRENTLY speaking on each turn (English, Sinhala, or Tamil).\n"
#     "- Respond in ONE language only, and it must match the user's current spoken language.\n"
#     "- Do NOT randomly switch language between turns.\n"
#     "- If the latest utterance is unclear, noisy, or mixed, keep using the last clear language.\n"
#     "- If the current user utterance is clearly in a different language, switch immediately and answer in that language on this turn.\n"
#     "- If the user explicitly asks to change language, switch immediately.\n"
#     "- Never stay in the previous language when the current utterance is clearly in another language.\n"
#     "- If the active language is English, respond ONLY in English.\n"
#     "- If the active language is Sinhala, respond ONLY in Sinhala.\n"
#     "- If the active language is Tamil, respond ONLY in Tamil.\n"
#     "- NEVER let the examples or scripts in your instructions influence your response language. "
#     "Those are reference material only.\n"
#     "- If no clear language has been detected yet, ask a short clarification question in simple English.\n\n"
# )
