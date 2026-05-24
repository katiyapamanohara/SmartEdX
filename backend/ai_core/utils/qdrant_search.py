"""Direct Qdrant course-KB search for text chat agents.

Uses the same collection naming and embedding model as the voice agent so
both agents read from the same Qdrant data without going through the voice
agent's HTTP API.

Collection naming (must match voice_agent/app/qdrant/course_kb.py):
    kb_{safe_institute_id}_{safe_course_id}
Embedding model: sentence-transformers/all-MiniLM-L6-v2 (dim=384, Cosine)
"""

from __future__ import annotations

import logging
import time
from threading import Lock
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
MAX_CONTENT_CHARS = 400

# ── Lazy embedding model (loaded once) ───────────────────────────────────────

_embedding_model = None
_embedding_model_lock = Lock()


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        with _embedding_model_lock:
            if _embedding_model is None:
                import os
                from fastembed import TextEmbedding
                logger.info(f"[ai_core/qdrant] Loading FastEmbed model: {EMBEDDING_MODEL}")
                cache_path = os.environ.get("FASTEMBED_CACHE_PATH")
                kwargs = {"cache_dir": cache_path} if cache_path else {}
                _embedding_model = TextEmbedding(EMBEDDING_MODEL, **kwargs)
                list(_embedding_model.embed(["warmup"]))
                logger.info("[ai_core/qdrant] FastEmbed model ready")
    return _embedding_model


def warmup_embedding_model() -> None:
    """Call at startup (in a background thread) so the first search is instant."""
    import threading
    threading.Thread(target=_get_embedding_model, daemon=True, name="fastembed-warmup").start()


# ── Query-vector cache ────────────────────────────────────────────────────────

_qvec_cache: dict[str, list] = {}
_qvec_lock = Lock()
_QVEC_MAX = 128


def _embed(query: str) -> list[float]:
    with _qvec_lock:
        if query in _qvec_cache:
            return _qvec_cache[query]
    vec = list(_get_embedding_model().embed([query]))[0].tolist()
    with _qvec_lock:
        if len(_qvec_cache) >= _QVEC_MAX:
            try:
                del _qvec_cache[next(iter(_qvec_cache))]
            except StopIteration:
                pass
        _qvec_cache[query] = vec
    return vec


# ── Qdrant HTTP helpers ───────────────────────────────────────────────────────

def _qdrant_headers() -> dict:
    h = {"Content-Type": "application/json"}
    if settings.QDRANT_API_KEY:
        h["api-key"] = settings.QDRANT_API_KEY
    return h


def _collection_name(institute_id: str, course_id: str) -> str:
    safe_inst = institute_id.lower().replace("-", "_")
    safe_course = course_id.lower().replace("-", "_")
    return f"kb_{safe_inst}_{safe_course}"


# ── Public search ─────────────────────────────────────────────────────────────

def search_course_kb(
    institute_id: str,
    course_id: str,
    query: str,
    limit: int = 3,
) -> list[dict]:
    """Search the course's Qdrant collection and return top hits.

    Returns a list of dicts with keys: content, page, title, score.
    Returns [] on any error so callers can gracefully fall back.
    """
    col = _collection_name(institute_id, course_id)
    url = f"{settings.QDRANT_URL.rstrip('/')}/collections/{col}/points/search"

    try:
        query_vector = _embed(query)
    except Exception as exc:
        logger.warning(f"[ai_core/qdrant] Embedding failed: {exc}")
        return []

    try:
        t0 = time.monotonic()
        with httpx.Client(timeout=8) as client:
            r = client.post(
                url,
                headers=_qdrant_headers(),
                json={
                    "vector": query_vector,
                    "limit": limit,
                    "with_payload": True,
                    "params": {"hnsw_ef": 64, "exact": False},
                },
            )
        elapsed = (time.monotonic() - t0) * 1000
        if r.status_code == 404:
            logger.info(f"[ai_core/qdrant] Collection {col!r} not found — no materials indexed yet")
            return []
        r.raise_for_status()
        hits = r.json().get("result", [])
        logger.info(f"[ai_core/qdrant] {len(hits)} hits from {col!r} in {elapsed:.0f}ms")
        return [
            {
                "content": h["payload"].get("content", "")[:MAX_CONTENT_CHARS],
                "page": h["payload"].get("page"),
                "title": h["payload"].get("title", ""),
                "score": round(h["score"], 3),
            }
            for h in hits
        ]
    except Exception as exc:
        logger.warning(f"[ai_core/qdrant] Search failed for {col!r}: {exc}")
        return []


def search_all_institute_kb(
    institute_id: str,
    query: str,
    limit: int = 5,
) -> list[dict]:
    """Search all course collections for an institute and return top results merged."""
    safe_inst = institute_id.lower().replace("-", "_")
    prefix = f"kb_{safe_inst}_"

    try:
        with httpx.Client(timeout=8) as client:
            r = client.get(
                f"{settings.QDRANT_URL.rstrip('/')}/collections",
                headers=_qdrant_headers(),
            )
        r.raise_for_status()
        all_cols = [c["name"] for c in r.json()["result"]["collections"]]
        cols = [c for c in all_cols if c.startswith(prefix)]
    except Exception as exc:
        logger.warning(f"[ai_core/qdrant] Could not list collections: {exc}")
        return []

    if not cols:
        return []

    try:
        query_vector = _embed(query)
    except Exception as exc:
        logger.warning(f"[ai_core/qdrant] Embedding failed: {exc}")
        return []

    all_results: list[dict] = []
    for col in cols:
        try:
            with httpx.Client(timeout=8) as client:
                r = client.post(
                    f"{settings.QDRANT_URL.rstrip('/')}/collections/{col}/points/search",
                    headers=_qdrant_headers(),
                    json={
                        "vector": query_vector,
                        "limit": 2,
                        "with_payload": True,
                        "params": {"hnsw_ef": 64, "exact": False},
                    },
                )
            if r.status_code == 404:
                continue
            r.raise_for_status()
            for h in r.json().get("result", []):
                all_results.append({
                    "content": h["payload"].get("content", "")[:MAX_CONTENT_CHARS],
                    "page": h["payload"].get("page"),
                    "title": h["payload"].get("title", ""),
                    "course_name": h["payload"].get("course_name", ""),
                    "score": round(h["score"], 3),
                })
        except Exception as exc:
            logger.warning(f"[ai_core/qdrant] Skip collection {col!r}: {exc}")

    all_results.sort(key=lambda x: x["score"], reverse=True)
    return all_results[:limit]
