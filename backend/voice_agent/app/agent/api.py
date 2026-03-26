"""Articom Core API client for session management."""

import logging
from typing import Any, Dict, List, Optional

import requests

from app.config import ARTICOM_API_KEY, ARTICOM_ASSISTANT_ID, SERVER_API, SERVER_CORE
from app.latency import latency

logger = logging.getLogger(__name__)


def fetch_assistant_config(assistant_id: str, token: str) -> Dict[str, Any]:
    """Fetch the comprehensive configuration for an assistant from Articom API."""
    url = f"{SERVER_API}/api/v1/assistants/{assistant_id}/comprehensive/voice"
    headers = {"Authorization": f"Bearer {token}"}
    with latency.measure("api_fetch_config"):
        response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def start_assistant_session(
    session_id: str,
    user_id: str,
    is_sip: Optional[bool] = True,
    call_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Start a voice session with Articom Core."""
    url = f"{SERVER_CORE}/api/session/voice/start"
    headers = {"Authorization": f"Bearer {ARTICOM_API_KEY}"}
    meta_data = {
        "type": "sip" if is_sip else "web",
        "user_id": user_id,
    }
    body = {
        "sip_session_id": session_id,
        "assistant_id": ARTICOM_ASSISTANT_ID,
        "sip_caller_id": call_id,
        "meta_data": meta_data,
    }
    with latency.measure("api_start_session"):
        response = requests.post(url, headers=headers, json=body, timeout=30)
    response.raise_for_status()
    return response.json()


def end_assistant_session(session_id: str, history: List[dict]) -> Dict[str, Any]:
    """End a voice session with Articom Core, sending final transcript."""
    url = f"{SERVER_CORE}/api/session/voice/end"
    headers = {"Authorization": f"Bearer {ARTICOM_API_KEY}"}
    body = {
        "session_id": session_id,
        "chat_history": history,
    }
    with latency.measure("api_end_session"):
        response = requests.post(url, headers=headers, json=body, timeout=30)
    response.raise_for_status()
    return response.json()
