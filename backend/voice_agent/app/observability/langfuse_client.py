"""Langfuse client initialization and no-op fallback.

When LANGFUSE_ENABLED is false, the observe decorator becomes a no-op
and get_langfuse() returns None, so calling code doesn't need conditionals.
"""

import logging
import threading
from typing import Optional

from app.config import LANGFUSE_ENABLED

logger = logging.getLogger(__name__)

# Populated lazily on first call to init_instrumentor()
_langfuse_client = None
_initialized = False
_init_lock = threading.Lock()


def _noop_observe(**kwargs):
    """No-op replacement for @observe when Langfuse is disabled."""

    def decorator(fn):
        return fn

    return decorator


# Public observe decorator — resolves at import time
if LANGFUSE_ENABLED:
    from langfuse import observe as observe_decorator
else:
    observe_decorator = _noop_observe


def init_instrumentor() -> None:
    """Initialize OpenInference ADK instrumentation (call once at startup)."""
    global _initialized
    with _init_lock:
        if _initialized:
            return
        _initialized = True
    if LANGFUSE_ENABLED:
        from openinference.instrumentation.google_adk import GoogleADKInstrumentor

        GoogleADKInstrumentor().instrument()
        logger.info("Langfuse tracing enabled — GoogleADKInstrumentor active")


def get_langfuse() -> Optional[object]:
    """Return the Langfuse client singleton, or None if disabled.

    The client is created on first call and cached.
    """
    global _langfuse_client
    if not LANGFUSE_ENABLED:
        return None
    with _init_lock:
        if _langfuse_client is None:
            from langfuse import get_client

            _langfuse_client = get_client()
    return _langfuse_client


def update_trace(*, tags: list, metadata: dict, version: str = "1.0.0") -> None:
    """Update the current Langfuse trace (safe no-op when disabled)."""
    langfuse = get_langfuse()
    if langfuse is None:
        return
    try:
        langfuse.update_current_trace(tags=tags, metadata=metadata, version=version)
    except Exception as e:
        logger.warning(f"Failed to update Langfuse trace (non-fatal): {e}")


def update_generation(*, input: list, output: list, model: str, usage_details: dict) -> None:
    """Update the current Langfuse generation (safe no-op when disabled)."""
    langfuse = get_langfuse()
    if langfuse is None:
        return
    if not any(v > 0 for v in usage_details.values()):
        return
    try:
        langfuse.update_current_generation(input=input, output=output, model=model, usage_details=usage_details)
        logger.info(f"Reported accumulated usage to Langfuse: {usage_details}")
    except Exception as e:
        logger.warning(f"Failed to update Langfuse generation (non-fatal): {e}")
