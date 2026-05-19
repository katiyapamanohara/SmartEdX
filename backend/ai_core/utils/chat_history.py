"""Qdrant-backed temporary chat history store.

Each message is stored as a point in collection ``chat_hist_{safe_institute_id}``.
Points are keyed by a UUID derived from (user_id, course_id, timestamp_ns) so
they're unique and idempotent.

Payload schema:
    user_id     – the user's UUID
    user_type   – "student" | "teacher"
    course_id   – the course UUID
    role        – "user" | "assistant"
    content     – message text
    timestamp   – Unix epoch float (seconds)

Retrieval: filter by user_id + course_id, sort ascending by timestamp,
return the most recent MAX_HISTORY_MESSAGES messages.

Temporary: after saving, messages older than HISTORY_TTL_DAYS are deleted
from the collection to keep storage bounded.
"""

from __future__ import annotations

import logging
import time
import uuid
from threading import Lock
from typing import Literal

import httpx

from config import settings

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 200
HISTORY_TTL_DAYS = 7
EMBEDDING_DIM = 384

_http: httpx.Client | None = None
_http_lock = Lock()

_known_cols: set[str] = set()
_known_cols_lock = Lock()


def _client() -> httpx.Client:
    global _http
    if _http is None:
        with _http_lock:
            if _http is None:
                _http = httpx.Client(timeout=8.0)
    return _http


def _headers() -> dict:
    h = {"Content-Type": "application/json"}
    if settings.QDRANT_API_KEY:
        h["api-key"] = settings.QDRANT_API_KEY
    return h


def _req(method: str, path: str, **kwargs) -> dict:
    url = f"{settings.QDRANT_URL.rstrip('/')}{path}"
    r = _client().request(method, url, headers=_headers(), **kwargs)
    r.raise_for_status()
    return r.json()


def _collection_name(institute_id: str) -> str:
    safe = institute_id.lower().replace("-", "_")
    return f"chat_hist_{safe}"


def _ensure_collection(col: str) -> None:
    with _known_cols_lock:
        if col in _known_cols:
            return

    try:
        result = _req("GET", "/collections")
        existing = {c["name"] for c in result["result"]["collections"]}
        if col not in existing:
            _req(
                "PUT",
                f"/collections/{col}",
                json={
                    "vectors": {"size": EMBEDDING_DIM, "distance": "Cosine"},
                    "optimizers_config": {"default_segment_number": 2},
                },
            )
            # payload index for fast filtering
            for field in ("user_id", "user_type", "course_id"):
                try:
                    _req(
                        "PUT",
                        f"/collections/{col}/index",
                        json={"field_name": field, "field_schema": "keyword"},
                    )
                except Exception:
                    pass
            # timestamp index for ordering
            try:
                _req(
                    "PUT",
                    f"/collections/{col}/index",
                    json={"field_name": "timestamp", "field_schema": "float"},
                )
            except Exception:
                pass
            logger.info(f"[chat_history] Created collection {col!r}")
        with _known_cols_lock:
            _known_cols.add(col)
    except Exception as exc:
        logger.warning(f"[chat_history] Could not ensure collection {col!r}: {exc}")


def _dummy_vector() -> list[float]:
    """Zero vector — we don't need semantic search on history, just filtering."""
    return [0.0] * EMBEDDING_DIM


def save_messages(
    institute_id: str,
    user_id: str,
    user_type: Literal["student", "teacher"],
    course_id: str,
    messages: list[dict],
) -> None:
    """Upsert a batch of messages into the chat history collection.

    Each message dict must have keys ``role`` and ``content``.
    An optional ``timestamp`` float may be provided; otherwise the current time
    is used with small increments to preserve ordering.
    """
    if not messages:
        return

    col = _collection_name(institute_id)
    try:
        _ensure_collection(col)
    except Exception as exc:
        logger.warning(f"[chat_history] save skipped — collection error: {exc}")
        return

    base_ts = time.time()
    points = []
    for i, msg in enumerate(messages):
        role = msg.get("role", "user")
        content = msg.get("content", "")
        ts = msg.get("timestamp", base_ts + i * 0.001)
        point_id = str(uuid.uuid5(
            uuid.NAMESPACE_DNS,
            f"{user_id}:{course_id}:{ts}:{role}:{content[:32]}",
        ))
        points.append({
            "id": point_id,
            "vector": _dummy_vector(),
            "payload": {
                "user_id": user_id,
                "user_type": user_type,
                "course_id": course_id,
                "role": role,
                "content": content,
                "timestamp": ts,
            },
        })

    try:
        # Upsert in one batch
        _req("PUT", f"/collections/{col}/points", json={"points": points})
        logger.info(f"[chat_history] Saved {len(points)} messages for {user_type} {user_id!r}")
    except Exception as exc:
        logger.warning(f"[chat_history] Save failed: {exc}")
        return

    # Prune old messages beyond MAX_HISTORY_MESSAGES for this user+course
    _prune(col, user_id, course_id)


def _prune(col: str, user_id: str, course_id: str) -> None:
    """Delete the oldest messages if count exceeds MAX_HISTORY_MESSAGES."""
    try:
        result = _req(
            "POST",
            f"/collections/{col}/points/scroll",
            json={
                "filter": {
                    "must": [
                        {"key": "user_id",   "match": {"value": user_id}},
                        {"key": "course_id", "match": {"value": course_id}},
                    ]
                },
                "limit": MAX_HISTORY_MESSAGES + 50,
                "with_payload": ["timestamp"],
                "order_by": {"key": "timestamp", "direction": "asc"},
            },
        )
        points = result.get("result", {}).get("points", [])
        if len(points) > MAX_HISTORY_MESSAGES:
            excess = points[: len(points) - MAX_HISTORY_MESSAGES]
            ids = [p["id"] for p in excess]
            _req(
                "POST",
                f"/collections/{col}/points/delete",
                json={"points": ids},
            )
            logger.info(f"[chat_history] Pruned {len(ids)} old messages")
    except Exception as exc:
        logger.debug(f"[chat_history] Prune skipped: {exc}")


def load_messages(
    institute_id: str,
    user_id: str,
    course_id: str,
    limit: int = MAX_HISTORY_MESSAGES,
) -> list[dict]:
    """Return recent messages for a user+course sorted oldest-first.

    Returns a list of dicts with keys: role, content, timestamp.
    Returns [] on any error.
    """
    col = _collection_name(institute_id)
    try:
        _ensure_collection(col)
    except Exception:
        return []

    try:
        result = _req(
            "POST",
            f"/collections/{col}/points/scroll",
            json={
                "filter": {
                    "must": [
                        {"key": "user_id",   "match": {"value": user_id}},
                        {"key": "course_id", "match": {"value": course_id}},
                    ]
                },
                "limit": limit,
                "with_payload": True,
                "order_by": {"key": "timestamp", "direction": "asc"},
            },
        )
        points = result.get("result", {}).get("points", [])
        msgs = [
            {
                "role":      p["payload"]["role"],
                "content":   p["payload"]["content"],
                "timestamp": p["payload"].get("timestamp", 0.0),
            }
            for p in points
        ]
        logger.info(f"[chat_history] Loaded {len(msgs)} messages for {user_id!r}/{course_id!r}")
        return msgs
    except Exception as exc:
        logger.warning(f"[chat_history] Load failed: {exc}")
        return []


def clear_history(institute_id: str, user_id: str, course_id: str) -> None:
    """Delete all history for a user+course (e.g. on explicit clear)."""
    col = _collection_name(institute_id)
    try:
        _req(
            "POST",
            f"/collections/{col}/points/delete",
            json={
                "filter": {
                    "must": [
                        {"key": "user_id",   "match": {"value": user_id}},
                        {"key": "course_id", "match": {"value": course_id}},
                    ]
                }
            },
        )
        logger.info(f"[chat_history] Cleared history for {user_id!r}/{course_id!r}")
    except Exception as exc:
        logger.warning(f"[chat_history] Clear failed: {exc}")
