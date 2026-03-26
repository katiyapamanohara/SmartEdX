"""Shared test fixtures for the Articom Voice Agent Service."""

import os

# Set test environment variables before any app imports
os.environ.setdefault("ARTICOM_ASSISTANT_ID", "test-assistant-id")
os.environ.setdefault("ARTICOM_API_KEY", "test-api-key")
os.environ.setdefault("SERVER_API", "http://localhost:8080")
os.environ.setdefault("SERVER_CORE", "http://localhost:8081")
os.environ.setdefault("LANGFUSE_ENABLED", "false")
os.environ.setdefault("CUSTOM_TOOLS_ENABLED", "false")
os.environ.setdefault("QDRANT_KB_ENABLED", "false")
os.environ.setdefault("SIP_ENABLED", "false")
os.environ.setdefault("SIP_AUDIO_GAIN", "1.0")
os.environ.setdefault("TRANSPORT_SIP_WS", "true")
os.environ.setdefault("GOOGLE_API_KEY", "test-api-key")
