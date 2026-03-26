"""SmartEdX Voice Agent package (Google ADK)."""

from .agent import (
    get_runner_for_institute,
    register_call_guard,
    search_knowledgebase,
    unregister_call_guard,
    update_call_guard,
)

__all__ = [
    "get_runner_for_institute",
    "register_call_guard",
    "search_knowledgebase",
    "unregister_call_guard",
    "update_call_guard",
]
