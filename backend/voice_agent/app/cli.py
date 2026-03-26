"""CLI entry point for the Articom Voice Agent Service.

Provides command-line arguments to select transport mediums, configure
networking, and override key settings without editing .env files.

Usage:
    python -m app --transport websocket --port 8080 --log-level debug
    python -m app -t sip-udp -t sip-ws --sip-port 5080 --reload
    articom-voice-agent --transport all
"""

import argparse
import os

TRANSPORTS = ("websocket", "sip-ws", "sip-udp")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="articom-voice-agent",
        description="Articom Voice Agent Service — real-time voice interaction platform",
    )

    # ── Transport selection ──────────────────────────────────────────
    parser.add_argument(
        "-t",
        "--transport",
        choices=[*TRANSPORTS, "all"],
        action="append",
        dest="transports",
        help=(
            "Transport medium(s) to enable. Can be specified multiple times. "
            "Choices: websocket (browser WS), sip-ws (Kamailio SIP-over-WS), "
            "sip-udp (native SIP/UDP). Use 'all' to enable everything. "
            "Default: all"
        ),
    )

    # ── Networking ───────────────────────────────────────────────────
    net = parser.add_argument_group("networking")
    net.add_argument("-H", "--host", default="0.0.0.0", help="HTTP bind address (default: 0.0.0.0)")
    net.add_argument("-p", "--port", type=int, default=8000, help="HTTP port (default: 8000)")
    net.add_argument("--sip-port", type=int, default=None, help="SIP/UDP listen port (default: from env or 5060)")
    net.add_argument("--sip-host", default=None, help="SIP server host for SDP (default: from env)")

    # ── Model / Agent ────────────────────────────────────────────────
    agent = parser.add_argument_group("model / agent")
    agent.add_argument("-m", "--model", default=None, help="Gemini model name (overrides DEMO_AGENT_MODEL)")
    agent.add_argument("--assistant-id", default=None, help="Articom assistant ID (overrides ARTICOM_ASSISTANT_ID)")
    agent.add_argument("--vertex", action="store_true", default=None, help="Use Vertex AI instead of Gemini API")
    agent.add_argument("--no-vertex", action="store_true", default=None, help="Use Gemini API (disable Vertex AI)")

    # ── Features ─────────────────────────────────────────────────────
    features = parser.add_argument_group("features")
    features.add_argument("--langfuse", action="store_true", default=False, help="Enable Langfuse observability")
    features.add_argument("--custom-tools", action="store_true", default=False, help="Enable custom HTTP tools")
    features.add_argument("--kb", action="store_true", default=False, help="Enable Qdrant knowledge base")

    # ── Development ──────────────────────────────────────────────────
    dev = parser.add_argument_group("development")
    dev.add_argument("--reload", action="store_true", default=False, help="Enable auto-reload (dev mode)")
    dev.add_argument(
        "-l",
        "--log-level",
        choices=["debug", "info", "warning", "error", "critical"],
        default="info",
        help="Log level (default: info)",
    )
    dev.add_argument("--workers", type=int, default=1, help="Number of uvicorn workers (default: 1)")

    args = parser.parse_args(argv)

    # Normalize transports
    if not args.transports:
        args.transports = list(TRANSPORTS)
    elif "all" in args.transports:
        args.transports = list(TRANSPORTS)
    else:
        # Deduplicate while preserving order
        seen = set()
        args.transports = [t for t in args.transports if not (t in seen or seen.add(t))]

    return args


def apply_overrides(args: argparse.Namespace) -> None:
    """Push CLI values into environment variables before the app imports config."""

    # Transport flags
    sip_udp_enabled = "sip-udp" in args.transports
    os.environ["SIP_ENABLED"] = str(sip_udp_enabled).lower()
    # Store WS transport flags for main.py to read
    os.environ["TRANSPORT_WEBSOCKET"] = str("websocket" in args.transports).lower()
    os.environ["TRANSPORT_SIP_WS"] = str("sip-ws" in args.transports).lower()

    # Networking
    if args.sip_port is not None:
        os.environ["SIP_PORT"] = str(args.sip_port)
    if args.sip_host is not None:
        os.environ["SIP_SERVER_HOST"] = args.sip_host

    # Model / Agent
    if args.model:
        os.environ["DEMO_AGENT_MODEL"] = args.model
    if args.assistant_id:
        os.environ["ARTICOM_ASSISTANT_ID"] = args.assistant_id
    if args.vertex:
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "TRUE"
    elif args.no_vertex:
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "FALSE"

    # Features
    if args.langfuse:
        os.environ["LANGFUSE_ENABLED"] = "true"
    if args.custom_tools:
        os.environ["CUSTOM_TOOLS_ENABLED"] = "true"
    if args.kb:
        os.environ["QDRANT_KB_ENABLED"] = "true"


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    apply_overrides(args)

    # Deferred import so env overrides take effect before config.py loads
    import uvicorn

    enabled = ", ".join(args.transports)
    print(f"Starting Articom Voice Agent — transports: [{enabled}]")
    print(f"  HTTP  : {args.host}:{args.port}")
    if "sip-udp" in args.transports:
        sip_port = args.sip_port or int(os.getenv("SIP_PORT", "5060"))
        print(f"  SIP   : UDP :{sip_port}")
    print(f"  Model : {args.model or os.getenv('DEMO_AGENT_MODEL', 'default')}")
    print(f"  Level : {args.log_level}")
    print()

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        reload=args.reload,
        workers=args.workers,
    )


if __name__ == "__main__":
    main()
