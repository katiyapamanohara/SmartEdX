"""SIP message parser for WebSocket and native UDP transports."""

import logging
import random
import re
import string
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class SIPMessage:
    """Represents a parsed SIP message."""

    def __init__(self, raw_message: str):
        self.raw = raw_message
        normalized = raw_message.replace("\r\n", "\n")
        self.lines = normalized.split("\n")

        self.start_line = self.lines[0] if self.lines else ""

        self.headers: Dict[str, str] = {}
        self.header_list: list = []
        self.body = ""

        in_body = False
        body_lines = []

        for line in self.lines[1:]:
            if not line.strip() and not in_body:
                in_body = True
                continue
            if in_body:
                body_lines.append(line)
            else:
                if ":" in line:
                    key, value = line.split(":", 1)
                    k = key.strip()
                    v = value.strip()
                    self.header_list.append((k, v))
                    self.headers[k] = v

        self.body = "\r\n".join(body_lines)

        self.is_request = not self.start_line.startswith("SIP/")

        if self.is_request:
            parts = self.start_line.split()
            self.method = parts[0] if len(parts) > 0 else ""
            self.uri = parts[1] if len(parts) > 1 else ""
            self.version = parts[2] if len(parts) > 2 else ""
        else:
            parts = self.start_line.split(None, 2)
            self.version = parts[0] if len(parts) > 0 else ""
            self.status_code = int(parts[1]) if len(parts) > 1 else 0
            self.reason = parts[2] if len(parts) > 2 else ""

    def get_header(self, name: str) -> Optional[str]:
        """Get first header value by name (case-insensitive)."""
        for key, value in self.header_list:
            if key.lower() == name.lower():
                return value
        return None

    def get_all_headers(self, name: str) -> list:
        """Get all values for a header name, preserving order."""
        return [v for k, v in self.header_list if k.lower() == name.lower()]

    def get_call_id(self) -> Optional[str]:
        return self.get_header("Call-ID")

    def get_from_tag(self) -> Optional[str]:
        from_header = self.get_header("From")
        if from_header:
            match = re.search(r"tag=([^;>\s]+)", from_header)
            if match:
                return match.group(1)
        return None

    def get_to_tag(self) -> Optional[str]:
        to_header = self.get_header("To")
        if to_header:
            match = re.search(r"tag=([^;>\s]+)", to_header)
            if match:
                return match.group(1)
        return None

    def get_sdp(self) -> Optional[str]:
        content_type = self.get_header("Content-Type")
        if content_type and "application/sdp" in content_type:
            return self.body
        return None

    def __repr__(self) -> str:
        if self.is_request:
            return f"<SIPRequest {self.method} {self.uri}>"
        else:
            return f"<SIPResponse {self.status_code} {self.reason}>"


class SIPResponseBuilder:
    """Helper to build SIP responses."""

    @staticmethod
    def build_response(
        request: SIPMessage,
        status_code: int,
        reason: str,
        body: str = "",
        extra_headers: Optional[Dict[str, str]] = None,
        remote_addr: Optional[Tuple[str, int]] = None,
        to_tag: Optional[str] = None,
    ) -> str:
        lines = [f"SIP/2.0 {status_code} {reason}"]

        via_headers = request.get_all_headers("Via")
        for i, via_value in enumerate(via_headers):
            if i == 0 and remote_addr:
                via_value = SIPResponseBuilder._process_via_rport(via_value, remote_addr)
            lines.append(f"Via: {via_value}")

        for rr_value in request.get_all_headers("Record-Route"):
            lines.append(f"Record-Route: {rr_value}")

        for header in ["From", "To", "Call-ID", "CSeq"]:
            value = request.get_header(header)
            if value:
                if header == "To" and status_code >= 200 and "tag=" not in value:
                    tag = to_tag or SIPResponseBuilder._generate_tag()
                    value += f";tag={tag}"
                lines.append(f"{header}: {value}")

        if extra_headers:
            for key, value in extra_headers.items():
                lines.append(f"{key}: {value}")

        lines.append(f"Content-Length: {len(body)}")
        lines.append("")
        if body:
            lines.append(body)
        else:
            lines.append("")

        return "\r\n".join(lines)

    @staticmethod
    def _process_via_rport(via_value: str, remote_addr: Tuple[str, int]) -> str:
        remote_ip, remote_port = remote_addr
        via_value = re.sub(r";rport(?!=)", f";rport={remote_port}", via_value)
        if "received=" not in via_value:
            via_value = re.sub(r"(;rport=\d+)", f"\\1;received={remote_ip}", via_value)
        return via_value

    @staticmethod
    def get_response_destination(request: "SIPMessage", source_addr: Tuple[str, int]) -> Tuple[str, int]:
        """Determine response destination per RFC 3261 §18.2.2."""
        topmost_via = request.get_header("Via")
        if not topmost_via:
            return source_addr

        received_match = re.search(r"received=([^\s;>]+)", topmost_via)
        rport_value_match = re.search(r"rport=(\d+)", topmost_via)
        bare_rport = bool(re.search(r";rport(?!=)", topmost_via))

        via_addr_match = re.search(r"SIP/2\.0/\w+\s+([^;:\s]+)(?::(\d+))?", topmost_via)

        if received_match:
            host = received_match.group(1)
        elif bare_rport or rport_value_match:
            host = source_addr[0]
        elif via_addr_match:
            host = via_addr_match.group(1)
        else:
            host = source_addr[0]

        if rport_value_match:
            port = int(rport_value_match.group(1))
        elif bare_rport:
            port = source_addr[1]
        elif via_addr_match and via_addr_match.group(2):
            port = int(via_addr_match.group(2))
        else:
            port = 5060

        return (host, port)

    @staticmethod
    def _generate_tag() -> str:
        return "".join(random.choices(string.ascii_letters + string.digits, k=10))


class SIPRequestBuilder:
    """Helper to build SIP requests within an established dialog."""

    @staticmethod
    def build_bye(
        invite: "SIPMessage",
        local_tag: str,
        server_host: str = "localhost",
    ) -> str:
        """Build a SIP BYE request to terminate a call from the UAS side."""
        call_id = invite.get_call_id() or "unknown"
        from_header = invite.get_header("From") or ""
        to_header = invite.get_header("To") or ""
        contact_header = invite.get_header("Contact")
        remote_tag = invite.get_from_tag() or ""

        local_uri = re.sub(r";tag=[^;>\s]+", "", to_header).strip()
        remote_uri = re.sub(r";tag=[^;>\s]+", "", from_header).strip()

        if contact_header:
            uri_match = re.search(r"<([^>]+)>", contact_header)
            request_uri = uri_match.group(1) if uri_match else contact_header.strip()
        else:
            uri_match = re.search(r"<([^>]+)>", from_header)
            request_uri = uri_match.group(1) if uri_match else f"sip:unknown@{server_host}"

        branch = f"z9hG4bK{''.join(random.choices(string.ascii_letters + string.digits, k=10))}"

        lines = [
            f"BYE {request_uri} SIP/2.0",
            f"Via: SIP/2.0/UDP {server_host};branch={branch}",
            "Max-Forwards: 70",
        ]

        record_routes = invite.get_all_headers("Record-Route")
        if record_routes:
            for rr in reversed(record_routes):
                lines.append(f"Route: {rr}")

        lines += [
            f"From: {local_uri};tag={local_tag}",
            f"To: {remote_uri};tag={remote_tag}",
            f"Call-ID: {call_id}",
            "CSeq: 1 BYE",
            "Content-Length: 0",
            "",
            "",
        ]
        return "\r\n".join(lines)
