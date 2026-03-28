"""Centralized configuration for the Voice Agent Service.

All environment variables and constants are defined here to avoid
scattered os.getenv() calls across modules.
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(Path(__file__).parent.parent / ".env", override=True)

# ── Google / Auth ────────────────────────────────────────────────────
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
GOOGLE_GENAI_USE_VERTEXAI = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").upper() == "TRUE"
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

# ── Application ──────────────────────────────────────────────────────
APP_NAME = "voice-agent"
LOG_FORMAT = os.getenv("LOG_FORMAT", "text")  # "json" for structured, "text" for human-readable
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# ── SmartEdX API ─────────────────────────────────────────────────────
SERVER_API = os.getenv("SERVER_API", "")
SERVER_CORE = os.getenv("SERVER_CORE", "")
AI_CORE_URL = os.getenv("AI_CORE_URL", "http://localhost:8001")
INSTITUTE_SERVICE_URL = os.getenv("INSTITUTE_SERVICE_URL", "http://localhost:5003")
INSTITUTE_ID = os.getenv("INSTITUTE_ID", "")
API_KEY = os.getenv("API_KEY", "")

# ── Agent / Model ────────────────────────────────────────────────────
DEMO_AGENT_MODEL = os.getenv("DEMO_AGENT_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025")
AGENT_VOICE = os.getenv("AGENT_VOICE", "Aoede")
SYSTEM_INSTRUCTION_OVERRIDE = os.getenv("SYSTEM_INSTRUCTION_OVERRIDE", "")
GREETING_MESSAGE_OVERRIDE = os.getenv("GREETING_MESSAGE_OVERRIDE", "")

# ── Custom Tools ─────────────────────────────────────────────────────
CUSTOM_TOOLS_ENABLED = os.getenv("CUSTOM_TOOLS_ENABLED", "false").lower() == "true"
MANIFEST_URL = os.getenv("MANIFEST_URL")
TOOLS_SECRET = os.getenv("TOOLS_SECRET")

# ── Knowledge Base (Qdrant) ──────────────────────────────────────────
QDRANT_KB_ENABLED = os.getenv("QDRANT_KB_ENABLED", "false").lower() == "true"
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "dp_instructions_kb")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

# ── Langfuse / Observability ────────────────────────────────────────
LANGFUSE_ENABLED = os.getenv("LANGFUSE_ENABLED", "false").lower() == "true"
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY", "")
LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_BASE_URL = os.getenv("LANGFUSE_BASE_URL", "")

# ── SIP / Telephony ─────────────────────────────────────────────────
SIP_ENABLED = os.getenv("SIP_ENABLED", "true").lower() == "true"
SIP_PORT = int(os.getenv("SIP_PORT", "5060"))
SIP_SDP_PORT = int(os.getenv("SIP_SDP_PORT", "20000"))
SIP_BIND_ADDRESS = os.getenv("SIP_BIND_ADDRESS", "0.0.0.0")
SIP_SERVER_HOST = os.getenv("SIP_SERVER_HOST", "localhost")
SIP_SDP_HOST = os.getenv("SIP_SDP_HOST", "127.0.0.1")
POD_IP = os.getenv("POD_IP", "")
SIP_USE_RTP = os.getenv("SIP_USE_RTP", "false").lower() == "true"
SIP_AUDIO_GAIN = float(os.getenv("SIP_AUDIO_GAIN", "3.0"))

# ── Transport Selection ──────────────────────────────────────────────
TRANSPORT_WEBSOCKET = os.getenv("TRANSPORT_WEBSOCKET", "true").lower() == "true"
TRANSPORT_SIP_WS = os.getenv("TRANSPORT_SIP_WS", "false").lower() == "true"

# ── Dashboard ────────────────────────────────────────────────────────
DASHBOARD_ENABLED = os.getenv("DASHBOARD_ENABLED", "true").lower() == "true"

# ── Audio / Barge-in ────────────────────────────────────────────────
HARD_MUTE_SECONDS = float(os.getenv("HARD_MUTE_SECONDS", "2.5"))
SILENCE_FLUSH_MS = int(os.getenv("SILENCE_FLUSH_MS", "1500"))
INTERRUPT_SILENCE_MS = int(os.getenv("INTERRUPT_SILENCE_MS", "500"))
SILENCE_END_FRAMES = int(os.getenv("SILENCE_END_FRAMES", "75"))
INTERRUPT_TIMEOUT_SECONDS = float(os.getenv("INTERRUPT_TIMEOUT_SECONDS", "8.0"))
MIN_USER_TURNS_BEFORE_END_CALL = int(os.getenv("MIN_USER_TURNS_BEFORE_END_CALL", "3"))
END_CALL_INTERRUPT_COOLDOWN = float(os.getenv("END_CALL_INTERRUPT_COOLDOWN", "5.0"))

# ── Audio Clip Tool Overrides ────────────────────────────────────────
# JSON object mapping tool names to audio clip configs.
# Simple:   {"get_contact_numbers": "/app/assets/contact_numbers.pcm"}
# Extended: {"get_contact_numbers": {"path": "...", "description": "...", "sample_rate": 24000}}
_AUDIO_CLIP_TOOL_MAP_RAW = os.getenv("AUDIO_CLIP_TOOL_MAP", "{}")
try:
    AUDIO_CLIP_TOOL_MAP: dict = json.loads(_AUDIO_CLIP_TOOL_MAP_RAW)
except (json.JSONDecodeError, ValueError):
    AUDIO_CLIP_TOOL_MAP = {}
