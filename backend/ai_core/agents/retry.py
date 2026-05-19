"""Shared retry helper for transient Gemini / OpenAI API errors."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Delays (seconds) before attempt 2, 3, 4 — i.e. after failures 1, 2, 3
_DEFAULT_DELAYS = (2, 5, 15)


def _is_retryable(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in (
        "503", "unavailable", "overloaded", "high demand",
        "rate limit", "429", "resource exhausted", "too many requests",
    ))


async def run_with_retry(
    fn: Callable[[], Awaitable[T]],
    *,
    max_attempts: int = 4,
    delays: tuple[float, ...] = _DEFAULT_DELAYS,
    label: str = "agent.arun",
) -> T:
    """Call *fn* up to *max_attempts* times, backing off on transient errors."""
    for attempt in range(1, max_attempts + 1):
        try:
            return await fn()
        except Exception as exc:
            if _is_retryable(exc) and attempt < max_attempts:
                delay = delays[min(attempt - 1, len(delays) - 1)]
                logger.warning(
                    "%s: transient error on attempt %d/%d — retrying in %ds. Error: %s",
                    label, attempt, max_attempts, delay, exc,
                )
                await asyncio.sleep(delay)
                continue
            logger.error("%s: failed after %d attempt(s). Last error: %s", label, attempt, exc)
            raise
    raise RuntimeError("unreachable")  # pragma: no cover
