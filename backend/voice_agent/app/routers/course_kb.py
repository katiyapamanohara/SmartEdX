"""HTTP router — course knowledge base indexing and deletion.

Endpoints are called by the institute service whenever a teacher uploads or
removes a PDF / Word document from a course module.

Routes:
    POST   /api/course-kb/index                                     – queue a document for indexing
    DELETE /api/course-kb/{institute_id}/{course_id}/content/{id}   – remove all points for a content_id
    POST   /api/course-kb/search                                    – debug search endpoint
"""

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.qdrant.course_kb import delete_content, ensure_collection, collection_name, index_content, search_course

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/course-kb", tags=["course-kb"])


# ── Request / response models ──────────────────────────────────────────


class IndexRequest(BaseModel):
    institute_id: str
    course_id: str
    course_name: str
    content_id: str
    file_url: str
    file_type: str  # "pdf" | "document"
    title: str


class SearchRequest(BaseModel):
    institute_id: str
    course_id: str
    query: str
    limit: int = 5


# ── Background helper ──────────────────────────────────────────────────


def _run_index(req: IndexRequest) -> None:
    """Called in a background thread so the HTTP response is immediate."""
    try:
        count = index_content(
            institute_id=req.institute_id,
            course_id=req.course_id,
            course_name=req.course_name,
            content_id=req.content_id,
            file_url=req.file_url,
            file_type=req.file_type,
            title=req.title,
        )
        logger.info(f"[course-kb] Indexed {count} points for content {req.content_id!r}")
    except Exception as e:
        logger.error(f"[course-kb] Background index failed for content {req.content_id!r}: {e}", exc_info=True)


# ── Endpoints ──────────────────────────────────────────────────────────


@router.post("/{institute_id}/{course_id}/ensure-collection", status_code=200)
async def ensure_course_collection(institute_id: str, course_id: str):
    """Pre-create the Qdrant collection for a course (idempotent, safe to call repeatedly)."""
    try:
        col = collection_name(institute_id, course_id)
        ensure_collection(col)
        return {"status": "ok", "collection": col}
    except Exception as e:
        logger.error(f"[course-kb] ensure-collection failed for {institute_id}/{course_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index", status_code=202)
async def index_course_content(req: IndexRequest, background_tasks: BackgroundTasks):
    """Queue a document for embedding into the course's dedicated Qdrant collection.

    Collection is named ``kb_{institute_id}_{course_id}`` and is created
    automatically if it does not exist yet.  Returns HTTP 202 immediately.
    """
    logger.info(
        f"[course-kb] Queuing index: content={req.content_id!r} "
        f"course={req.course_name!r} institute={req.institute_id!r} type={req.file_type!r}"
    )
    background_tasks.add_task(_run_index, req)
    return {"status": "queued", "content_id": req.content_id, "course_id": req.course_id, "institute_id": req.institute_id}


@router.delete("/{institute_id}/{course_id}/content/{content_id}")
async def remove_course_content(institute_id: str, course_id: str, content_id: str):
    """Delete all Qdrant points for a content_id from the course's collection."""
    try:
        delete_content(institute_id, course_id, content_id)
        return {"status": "deleted", "content_id": content_id, "collection": f"kb_{institute_id}_{course_id}"}
    except Exception as e:
        logger.error(f"[course-kb] Delete failed for content {content_id!r}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_course_content(req: SearchRequest):
    """Search a course's knowledge base collection (for testing / debug)."""
    try:
        results = search_course(institute_id=req.institute_id, course_id=req.course_id, query=req.query, limit=req.limit)
        if not results:
            return {"status": "no_results", "results": []}
        return {"status": "ok", "results": results}
    except Exception as e:
        logger.error(f"[course-kb] Search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
