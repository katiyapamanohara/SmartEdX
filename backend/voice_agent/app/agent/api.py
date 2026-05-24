"""SmartEdX API client — fetches institute config and manages sessions."""

import logging
from typing import Any, Dict, List, Optional

import requests

from app.config import API_KEY, INSTITUTE_SERVICE_URL, SERVER_CORE
from app.latency import latency

logger = logging.getLogger(__name__)


def fetch_course_agent_config(institute_id: str, course_id: str) -> Dict[str, Any]:
    """Fetch agent instructions for a specific course from the institute service.

    Returns a dict with keys: courseId, courseName, studentAgentInstructions, teacherAgentInstructions.
    """
    url = f"{INSTITUTE_SERVICE_URL}/institutes/{institute_id}/courses/{course_id}/agent-config"
    with latency.measure("api_fetch_course_agent_config"):
        response = requests.get(url, timeout=5)
    if response.status_code == 404:
        logger.warning(f"Course {course_id} agent-config not found (404), using defaults")
        return {}
    response.raise_for_status()
    return response.json()


def fetch_institute_config(institute_id: str) -> Dict[str, Any]:
    """Fetch voice agent configuration for an institute from the SmartEdX institute service.

    Returns a dict with keys: id, name, voiceInstructions, voiceGreeting.
    """
    url = f"{INSTITUTE_SERVICE_URL}/auth/institutes/{institute_id}/voice-config"
    with latency.measure("api_fetch_config"):
        response = requests.get(url, timeout=5)
    if response.status_code == 404:
        logger.warning(f"Institute {institute_id} voice-config not found (404), using defaults")
        return {}
    response.raise_for_status()
    return response.json()


def start_assistant_session(
    session_id: str,
    user_id: str,
    institute_id: str,
    is_sip: Optional[bool] = True,
    call_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Start a voice session with SmartEdX Core."""
    url = f"{SERVER_CORE}/api/session/voice/start"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    meta_data = {
        "type": "sip" if is_sip else "web",
        "user_id": user_id,
    }
    body = {
        "sip_session_id": session_id,
        "institute_id": institute_id,
        "sip_caller_id": call_id,
        "meta_data": meta_data,
    }
    with latency.measure("api_start_session"):
        response = requests.post(url, headers=headers, json=body, timeout=8)
    response.raise_for_status()
    return response.json()


def end_assistant_session(session_id: str, history: List[dict]) -> Dict[str, Any]:
    """End a voice session with Core, sending final transcript."""
    url = f"{SERVER_CORE}/api/session/voice/end"
    headers = {"Authorization": f"Bearer {API_KEY}"}
    body = {
        "session_id": session_id,
        "chat_history": history,
    }
    with latency.measure("api_end_session"):
        response = requests.post(url, headers=headers, json=body, timeout=8)
    response.raise_for_status()
    return response.json()
