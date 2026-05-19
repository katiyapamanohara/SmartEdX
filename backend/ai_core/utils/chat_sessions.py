"""Per-chat Qdrant collection manager.

Each chat session gets its own dedicated Qdrant collection named:

    chat_{inst8}_{course8}_{user8}_{role}_{chat_id}

where:
  inst8   = first 8 chars of institute_id (hyphens → underscores)
  course8 = first 8 chars of course_id
  user8   = first 8 chars of user_id
  role    = "student" or "teacher"
  chat_id = short random 8-char hex ID

A separate index collection (chat_idx_{inst8}_{user8}) stores chat metadata
(id, title, course_id, role, created_at, updated_at) as Qdrant points so we
can list and manage chats without scanning message collections.

Messages are stored as points with a dummy zero-vector (no semantic search
needed — history retrieval uses payload filtering + timestamp ordering).
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from threading import Lock
from typing import Literal

import httpx

from config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384
MAX_MESSAGES = 300   # max messages kept per chat session

_http: httpx.Client | None = None
_http_lock = Lock()
_known_cols: set[str] = set()
_known_cols_lock = Lock()


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _client() -> httpx.Client:
    global _http
    if _http is None:
        with _http_lock:
            if _http is None:
                _http = httpx.Client(timeout=10.0)
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


def _zero_vec() -> list[float]:
    return [0.0] * EMBEDDING_DIM


# ── Naming ────────────────────────────────────────────────────────────────────

def _safe8(uid: str) -> str:
    """First 8 chars of an ID with hyphens replaced by underscores."""
    return uid.lower().replace("-", "_")[:8]


def _msg_collection(institute_id: str, course_id: str, user_id: str, role: str, chat_id: str) -> str:
    return f"chat_{_safe8(institute_id)}_{_safe8(course_id)}_{_safe8(user_id)}_{role}_{chat_id}"


def _idx_collection(institute_id: str, user_id: str) -> str:
    return f"chat_idx_{_safe8(institute_id)}_{_safe8(user_id)}"


# ── Collection creation ───────────────────────────────────────────────────────

def _ensure_col(col: str, indexes: list[str] | None = None) -> None:
    with _known_cols_lock:
        if col in _known_cols:
            return
    try:
        result = _req("GET", "/collections")
        existing = {c["name"] for c in result["result"]["collections"]}
        if col not in existing:
            _req("PUT", f"/collections/{col}", json={
                "vectors": {"size": EMBEDDING_DIM, "distance": "Cosine"},
                "optimizers_config": {"default_segment_number": 1},
            })
            for field in (indexes or []):
                schema = "float" if field in ("created_at", "updated_at", "timestamp", "seq") else "keyword"
                try:
                    _req("PUT", f"/collections/{col}/index", json={"field_name": field, "field_schema": schema})
                except Exception:
                    pass
            logger.info(f"[chat_sessions] Created collection {col!r}")
        with _known_cols_lock:
            _known_cols.add(col)
    except Exception as exc:
        logger.warning(f"[chat_sessions] ensure_col {col!r} failed: {exc}")


# ── Chat CRUD ─────────────────────────────────────────────────────────────────

def new_chat_id() -> str:
    return uuid.uuid4().hex[:8]


def create_chat(
    institute_id: str,
    course_id: str,
    user_id: str,
    role: Literal["student", "teacher"],
    title: str = "New Chat",
) -> dict:
    """Create a new chat session. Returns the chat metadata dict."""
    chat_id = new_chat_id()
    now = time.time()

    # Ensure message collection exists
    msg_col = _msg_collection(institute_id, course_id, user_id, role, chat_id)
    _ensure_col(msg_col, indexes=["timestamp", "seq"])

    # Write to index collection — retry up to 3 times in case of transient failures
    idx_col = _idx_collection(institute_id, user_id)
    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}:{course_id}:{chat_id}"))
    point_data = {"points": [{
        "id": point_id,
        "vector": _zero_vec(),
        "payload": {
            "chat_id":       chat_id,
            "course_id":     course_id,
            "institute_id":  institute_id,
            "user_id":       user_id,
            "role":          role,
            "title":         title,
            "created_at":    now,
            "updated_at":    now,
            "message_count": 0,
            "msg_collection": msg_col,
        },
    }]}

    for attempt in range(3):
        # Discard cached state so _ensure_col re-verifies the collection exists
        with _known_cols_lock:
            _known_cols.discard(idx_col)
        _ensure_col(idx_col, indexes=["course_id", "role", "created_at", "updated_at"])
        try:
            _req("PUT", f"/collections/{idx_col}/points", json=point_data)
            logger.info(f"[chat_sessions] Created chat {chat_id!r} for {role} {user_id!r} (attempt {attempt+1})")
            break
        except Exception as exc:
            logger.warning(f"[chat_sessions] create_chat index write attempt {attempt+1} failed: {exc}")
            if attempt < 2:
                time.sleep(0.15)

    return {
        "chat_id": chat_id,
        "course_id": course_id,
        "role": role,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "message_count": 0,
        "msg_collection": msg_col,
    }


def list_chats(
    institute_id: str,
    user_id: str,
    course_id: str,
    role: str,
) -> list[dict]:
    """Return all chats for a user+course+role sorted newest-first."""
    idx_col = _idx_collection(institute_id, user_id)
    _ensure_col(idx_col, indexes=["course_id", "role", "created_at", "updated_at"])

    try:
        result = _req("POST", f"/collections/{idx_col}/points/scroll", json={
            "filter": {"must": [
                {"key": "course_id", "match": {"value": course_id}},
                {"key": "role",      "match": {"value": role}},
            ]},
            "limit": 100,
            "with_payload": True,
        })
        points = result.get("result", {}).get("points", [])
        points.sort(key=lambda p: p["payload"].get("updated_at") or 0.0, reverse=True)
        return [p["payload"] for p in points]
    except Exception as exc:
        logger.warning(f"[chat_sessions] list_chats failed: {exc}")
        return []


def delete_chat(
    institute_id: str,
    user_id: str,
    course_id: str,
    role: str,
    chat_id: str,
) -> None:
    """Drop the message collection and remove from index."""
    msg_col = _msg_collection(institute_id, course_id, user_id, role, chat_id)
    try:
        _req("DELETE", f"/collections/{msg_col}")
        with _known_cols_lock:
            _known_cols.discard(msg_col)
        logger.info(f"[chat_sessions] Dropped message collection {msg_col!r}")
    except Exception as exc:
        logger.debug(f"[chat_sessions] drop msg_col skipped: {exc}")

    # Remove from index
    idx_col = _idx_collection(institute_id, user_id)
    try:
        _req("POST", f"/collections/{idx_col}/points/delete", json={
            "filter": {"must": [
                {"key": "chat_id",   "match": {"value": chat_id}},
                {"key": "course_id", "match": {"value": course_id}},
            ]},
        })
    except Exception as exc:
        logger.debug(f"[chat_sessions] index delete skipped: {exc}")


def rename_chat(
    institute_id: str,
    user_id: str,
    course_id: str,
    role: str,
    chat_id: str,
    title: str,
) -> None:
    """Update the title of a chat in the index."""
    idx_col = _idx_collection(institute_id, user_id)
    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}:{course_id}:{chat_id}"))
    try:
        _req("POST", f"/collections/{idx_col}/points/payload", json={
            "payload": {"title": title, "updated_at": time.time()},
            "points": [point_id],
        })
    except Exception as exc:
        logger.warning(f"[chat_sessions] rename_chat failed: {exc}")


# ── Message storage ───────────────────────────────────────────────────────────

def save_messages(
    institute_id: str,
    course_id: str,
    user_id: str,
    role: str,
    chat_id: str,
    messages: list[dict],
) -> None:
    """Upsert messages into the chat's Qdrant collection."""
    if not messages:
        return

    msg_col = _msg_collection(institute_id, course_id, user_id, role, chat_id)
    _ensure_col(msg_col, indexes=["timestamp", "seq"])

    base_ts = time.time()
    points = []
    for i, msg in enumerate(messages):
        ts = msg.get("timestamp", base_ts + i * 0.001)
        point_id = str(uuid.uuid5(
            uuid.NAMESPACE_DNS,
            f"{chat_id}:{ts}:{msg.get('role','')}:{msg.get('content','')[:32]}",
        ))
        points.append({
            "id": point_id,
            "vector": _zero_vec(),
            "payload": {
                "role":      msg.get("role", "user"),
                "content":   msg.get("content", ""),
                "timestamp": ts,
                "seq":       i,
            },
        })

    try:
        _req("PUT", f"/collections/{msg_col}/points", json={"points": points})
    except Exception as exc:
        logger.warning(f"[chat_sessions] save_messages failed: {exc}")
        return

    # Update index updated_at and message_count
    idx_col = _idx_collection(institute_id, user_id)
    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}:{course_id}:{chat_id}"))
    try:
        _req("POST", f"/collections/{idx_col}/points/payload", json={
            "payload": {"updated_at": time.time(), "message_count": len(messages)},
            "points": [point_id],
        })
    except Exception:
        pass

    _prune(msg_col)


def _prune(msg_col: str) -> None:
    """Keep only the most recent MAX_MESSAGES messages."""
    try:
        result = _req("POST", f"/collections/{msg_col}/points/scroll", json={
            "limit": MAX_MESSAGES + 50,
            "with_payload": ["timestamp"],
        })
        points = result.get("result", {}).get("points", [])
        if len(points) > MAX_MESSAGES:
            points.sort(key=lambda p: p["payload"].get("timestamp") or 0.0)
            excess_ids = [p["id"] for p in points[: len(points) - MAX_MESSAGES]]
            _req("POST", f"/collections/{msg_col}/points/delete", json={"points": excess_ids})
    except Exception as exc:
        logger.debug(f"[chat_sessions] prune skipped: {exc}")


def load_messages(
    institute_id: str,
    course_id: str,
    user_id: str,
    role: str,
    chat_id: str,
    limit: int = MAX_MESSAGES,
) -> list[dict]:
    """Return messages for a chat sorted oldest-first."""
    msg_col = _msg_collection(institute_id, course_id, user_id, role, chat_id)
    _ensure_col(msg_col, indexes=["timestamp", "seq"])

    try:
        result = _req("POST", f"/collections/{msg_col}/points/scroll", json={
            "limit": limit,
            "with_payload": True,
        })
        points = result.get("result", {}).get("points", [])
        points.sort(key=lambda p: (p["payload"].get("timestamp") or 0.0, p["payload"].get("seq", 0)))
        return [
            {
                "role":      p["payload"]["role"],
                "content":   p["payload"]["content"],
                "timestamp": p["payload"].get("timestamp", 0.0),
            }
            for p in points
        ]
    except Exception as exc:
        logger.warning(f"[chat_sessions] load_messages failed: {exc}")
        return []


def get_msg_collection_name(
    institute_id: str,
    course_id: str,
    user_id: str,
    role: str,
    chat_id: str,
) -> str:
    """Return the Qdrant collection name for the given chat (used by voice agent)."""
    return _msg_collection(institute_id, course_id, user_id, role, chat_id)
