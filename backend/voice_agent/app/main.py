"""Articom Voice Agent Service - Real-time voice interaction platform."""

import asyncio
import logging
import time
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.adk.sessions import InMemorySessionService

# Load environment variables BEFORE importing agent (needs config at import time)
load_dotenv(Path(__file__).parent.parent / ".env")

from app.agent import get_runner_for_institute, search_knowledgebase  # noqa: E402
from app.config import (  # noqa: E402
    APP_NAME,
    CUSTOM_TOOLS_ENABLED,
    DASHBOARD_ENABLED,
    DEMO_AGENT_MODEL,
    GOOGLE_GENAI_USE_VERTEXAI,
    INSTITUTE_ID,
    LANGFUSE_ENABLED,
    LOG_FORMAT,
    LOG_LEVEL,
    QDRANT_KB_ENABLED,
    SIP_ENABLED,
    SIP_PORT,
    TRANSPORT_SIP_WS,
    TRANSPORT_WEBSOCKET,
)
from app.latency import latency as latency_tracker  # noqa: E402
from app.observability.langfuse_client import init_instrumentor  # noqa: E402
from app.transport.sip_udp.server import get_sip_server, start_native_sip_server, stop_native_sip_server  # noqa: E402
from app.transport.sip_websocket.handler import sip_websocket_endpoint  # noqa: E402
from app.transport.websocket.handler import websocket_endpoint  # noqa: E402

# Configure logging
if LOG_FORMAT == "json":
    from pythonjsonlogger.json import JsonFormatter

    handler = logging.StreamHandler()
    handler.setFormatter(
        JsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            rename_fields={"asctime": "timestamp", "levelname": "level"},
        )
    )
    logging.root.handlers = [handler]
    logging.root.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

logger = logging.getLogger(__name__)

# Suppress ADK internal error logs for expected 1008 disconnects
logging.getLogger("google_adk.google.adk.flows.llm_flows.base_llm_flow").setLevel(logging.CRITICAL)
logging.getLogger("google.adk.flows.llm_flows.base_llm_flow").setLevel(logging.CRITICAL)
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# Initialize Langfuse ADK instrumentor (no-op if disabled)
init_instrumentor()

# ── Core services ────────────────────────────────────────────────────

session_service = InMemorySessionService()
transcript_store: dict = {}
_transcript_lock = asyncio.Lock()
_start_time = time.time()


# ── Application lifecycle ────────────────────────────────────────────


def _print_banner() -> None:
    """Print startup banner with configuration summary."""
    on = "\033[32mon\033[0m"
    off = "\033[90moff\033[0m"
    flag = lambda v: on if v else off  # noqa: E731

    banner = f"""\033[36m
     _    ____ _____ ___ ____ ___  __  __
    / \\  |  _ \\_   _|_ _/ ___/ _ \\|  \\/  |
   / _ \\ | |_) || |  | | |  | | | | |\\/| |
  / ___ \\|  _ < | |  | | |__| |_| | |  | |
 /_/   \\_\\_| \\_\\|_| |___\\____\\___/|_|  |_|
\033[0m\033[1m         Voice Agent Service v0.1.0\033[0m

  Model       : {DEMO_AGENT_MODEL}
  Platform    : {"Vertex AI" if GOOGLE_GENAI_USE_VERTEXAI else "Gemini API"}

  Transports
    WebSocket : {flag(TRANSPORT_WEBSOCKET)}
    SIP-WS    : {flag(TRANSPORT_SIP_WS)}
    SIP/UDP   : {flag(SIP_ENABLED)}{f"  (port {SIP_PORT})" if SIP_ENABLED else ""}

  Features
    Dashboard : {flag(DASHBOARD_ENABLED)}
    Langfuse  : {flag(LANGFUSE_ENABLED)}
    Custom Tools : {flag(CUSTOM_TOOLS_ENABLED)}
    Knowledge Base : {flag(QDRANT_KB_ENABLED)}
"""
    print(banner)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.config import SIP_ENABLED

    sip_enabled = SIP_ENABLED

    _print_banner()

    if sip_enabled:
        logger.info("Starting native SIP/UDP server...")
        try:
            sip_runner, _ = get_runner_for_institute(INSTITUTE_ID, session_service)
            await start_native_sip_server(
                runner=sip_runner,
                session_service=session_service,
                app_name=APP_NAME,
                institute_id=INSTITUTE_ID,
            )
            logger.info("Native SIP server started successfully")
        except Exception as e:
            logger.error(f"Failed to start native SIP server: {e}", exc_info=True)
    else:
        logger.info("Native SIP server disabled (SIP_ENABLED=false)")

    yield

    if sip_enabled:
        logger.info("Stopping native SIP server...")
        await stop_native_sip_server()


app = FastAPI(lifespan=lifespan)

# Mount static files and dashboard routes only when enabled
if DASHBOARD_ENABLED:
    static_dir = Path(__file__).parent / "static"
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# ── HTTP endpoints ─────────────────────────────────────────────────────

if DASHBOARD_ENABLED:

    @app.get("/")
    async def root():
        """Serve the dashboard as the homepage."""
        return FileResponse(Path(__file__).parent / "static" / "dashboard.html")

    @app.get("/simulator")
    async def simulator():
        """Serve the voice agent simulator UI."""
        return FileResponse(Path(__file__).parent / "static" / "index.html")
else:
    logger.info("Dashboard disabled (DASHBOARD_ENABLED=false)")


@app.get("/health")
async def health():
    sip_server = get_sip_server()
    return {
        "status": "healthy",
        "native_sip": {
            "enabled": sip_server is not None,
            "active_calls": len(sip_server.calls) if sip_server else 0,
        },
    }


@app.post("/api/knowledgebase/search")
async def knowledgebase_search(payload: dict):
    """Search the knowledge base for relevant information."""
    query = payload.get("query", "").strip()
    if not query:
        return {"status": "error", "message": "Query is required."}
    limit = min(int(payload.get("limit", 5)), 20)
    return search_knowledgebase(query=query, limit=limit)


@app.get("/api/stats")
async def api_stats():
    """Return all runtime stats for the dashboard."""
    sip_server = get_sip_server()
    uptime = time.time() - _start_time

    # SIP call details
    sip_calls = []
    if sip_server:
        for cid, c in list(sip_server.calls.items()):
            sip_calls.append(
                {
                    "call_id": cid,
                    "user_id": c.user_id,
                    "session_id": c.session_id,
                    "is_active": c.is_active,
                    "rtp_frames": c.rtp_frame_count,
                    "user_turns": c.user_turn_count,
                    "playback_active": c.playback_active,
                    "interrupt_active": c.interrupt_active,
                    "audio_suppressed": c.audio_suppressed,
                    "bye_sent": c.bye_sent,
                    "core_session_id": c.core_session_id,
                }
            )

    # Transcript summaries — snapshot under lock to avoid races with handlers
    async with _transcript_lock:
        all_transcripts = {**transcript_store}
    if sip_server:
        all_transcripts.update(sip_server.transcript_store)

    sessions = []
    for sid, messages in all_transcripts.items():
        user_msgs = [m for m in messages if m.get("actor") == "user" or m.get("role") == "user"]
        agent_msgs = [m for m in messages if m.get("actor") in ("bot", "agent") or m.get("role") in ("bot", "agent")]
        sessions.append(
            {
                "session_id": sid,
                "total_messages": len(messages),
                "user_messages": len(user_msgs),
                "agent_messages": len(agent_msgs),
            }
        )

    return {
        "uptime_seconds": round(uptime, 1),
        "config": {
            "model": DEMO_AGENT_MODEL,
            "vertex_ai": GOOGLE_GENAI_USE_VERTEXAI,
            "langfuse": LANGFUSE_ENABLED,
            "custom_tools": CUSTOM_TOOLS_ENABLED,
            "knowledge_base": QDRANT_KB_ENABLED,
        },
        "transports": {
            "websocket": TRANSPORT_WEBSOCKET,
            "sip_ws": TRANSPORT_SIP_WS,
            "sip_udp": SIP_ENABLED,
            "sip_port": SIP_PORT if SIP_ENABLED else None,
        },
        "sip": {
            "enabled": sip_server is not None,
            "active_calls": len(sip_server.calls) if sip_server else 0,
            "calls": sip_calls,
        },
        "sessions": {
            "total": len(all_transcripts),
            "details": sessions,
        },
        "latencies": latency_tracker.summary(),
    }


# ── WebSocket endpoints ─────────────────────────────────────────────

if TRANSPORT_SIP_WS:

    @app.websocket("/sip")
    async def sip_endpoint(websocket: WebSocket) -> None:
        """SIP-over-WebSocket telephony endpoint (Kamailio proxy)."""
        sip_runner, _ = get_runner_for_institute(INSTITUTE_ID, session_service)
        await sip_websocket_endpoint(
            websocket=websocket,
            runner=sip_runner,
            session_service=session_service,
            app_name=APP_NAME,
            transcript_store=transcript_store,
        )
else:
    logger.info("SIP-over-WebSocket transport disabled")


if TRANSPORT_WEBSOCKET:

    @app.websocket("/ws/{institute_id}/{user_id}/{session_id}")
    async def ws_endpoint(
        websocket: WebSocket,
        institute_id: str,
        user_id: str,
        session_id: str,
        proactivity: bool = False,
        affective_dialog: bool = False,
        language: Optional[str] = None,
    ) -> None:
        """WebSocket endpoint — institute_id selects the per-institute agent."""
        await websocket_endpoint(
            websocket=websocket,
            institute_id=institute_id,
            session_service=session_service,
            transcript_store=transcript_store,
            user_id=user_id,
            session_id=session_id,
            proactivity=proactivity,
            affective_dialog=affective_dialog,
            language=language,
        )
else:
    logger.info("Browser WebSocket transport disabled")
