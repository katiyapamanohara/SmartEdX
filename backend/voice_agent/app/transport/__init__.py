"""Transport handlers — WebSocket, SIP-over-WebSocket, Native SIP/UDP."""

from .sip_udp.server import (
    NativeSIPServer,
    get_sip_server,
    start_native_sip_server,
    stop_native_sip_server,
)
from .sip_websocket.handler import sip_websocket_endpoint
from .websocket.handler import websocket_endpoint

__all__ = [
    "websocket_endpoint",
    "sip_websocket_endpoint",
    "NativeSIPServer",
    "start_native_sip_server",
    "stop_native_sip_server",
    "get_sip_server",
]
