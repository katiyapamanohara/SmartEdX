"""Unit tests for app.sip.parser module."""

from app.sip.parser import SIPMessage, SIPRequestBuilder, SIPResponseBuilder

SAMPLE_INVITE = (
    "INVITE sip:agent@localhost SIP/2.0\r\n"
    "Via: SIP/2.0/UDP 192.168.1.100:5060;branch=z9hG4bK776asdhds;rport\r\n"
    "From: <sip:+15551234567@provider.com>;tag=1928301774\r\n"
    "To: <sip:agent@localhost>\r\n"
    "Call-ID: a84b4c76e66710@provider.com\r\n"
    "CSeq: 314159 INVITE\r\n"
    "Contact: <sip:+15551234567@provider.com>\r\n"
    "Content-Type: application/sdp\r\n"
    "Content-Length: 100\r\n"
    "\r\n"
    "v=0\r\n"
    "o=- 0 0 IN IP4 192.0.2.1\r\n"
    "s=Test Call\r\n"
    "c=IN IP4 192.0.2.1\r\n"
    "t=0 0\r\n"
    "m=audio 49170 RTP/AVP 0\r\n"
    "a=rtpmap:0 PCMU/8000\r\n"
)

SAMPLE_RESPONSE = "SIP/2.0 200 OK\r\nVia: SIP/2.0/UDP 192.168.1.100\r\nCall-ID: test123\r\n\r\n"


class TestSIPMessage:
    def test_parse_invite_request(self):
        msg = SIPMessage(SAMPLE_INVITE)
        assert msg.is_request is True
        assert msg.method == "INVITE"
        assert "agent@localhost" in msg.uri

    def test_parse_response(self):
        msg = SIPMessage(SAMPLE_RESPONSE)
        assert msg.is_request is False
        assert msg.status_code == 200
        assert msg.reason == "OK"

    def test_get_call_id(self):
        msg = SIPMessage(SAMPLE_INVITE)
        assert msg.get_call_id() == "a84b4c76e66710@provider.com"

    def test_get_from_tag(self):
        msg = SIPMessage(SAMPLE_INVITE)
        assert msg.get_from_tag() == "1928301774"

    def test_get_to_tag_none_when_absent(self):
        msg = SIPMessage(SAMPLE_INVITE)
        assert msg.get_to_tag() is None

    def test_get_header_case_insensitive(self):
        msg = SIPMessage(SAMPLE_INVITE)
        assert msg.get_header("call-id") == "a84b4c76e66710@provider.com"
        assert msg.get_header("CALL-ID") == "a84b4c76e66710@provider.com"

    def test_get_sdp(self):
        msg = SIPMessage(SAMPLE_INVITE)
        sdp = msg.get_sdp()
        assert sdp is not None
        assert "v=0" in sdp
        assert "PCMU" in sdp

    def test_get_sdp_none_without_content_type(self):
        raw = "INVITE sip:agent@localhost SIP/2.0\r\nCall-ID: test\r\n\r\nsome body"
        msg = SIPMessage(raw)
        assert msg.get_sdp() is None

    def test_get_all_headers(self):
        raw = "SIP/2.0 200 OK\r\nVia: SIP/2.0/UDP first\r\nVia: SIP/2.0/UDP second\r\nCall-ID: test\r\n\r\n"
        msg = SIPMessage(raw)
        vias = msg.get_all_headers("Via")
        assert len(vias) == 2
        assert "first" in vias[0]
        assert "second" in vias[1]

    def test_repr_request(self):
        msg = SIPMessage(SAMPLE_INVITE)
        repr_str = repr(msg)
        assert "SIPRequest" in repr_str
        assert "INVITE" in repr_str

    def test_repr_response(self):
        msg = SIPMessage(SAMPLE_RESPONSE)
        assert "SIPResponse" in repr(msg)
        assert "200" in repr(msg)


class TestSIPResponseBuilder:
    def test_build_100_trying(self):
        request = SIPMessage(SAMPLE_INVITE)
        response = SIPResponseBuilder.build_response(request, 100, "Trying")
        assert "SIP/2.0 100 Trying" in response
        assert "Call-ID: a84b4c76e66710@provider.com" in response

    def test_build_200_ok_with_to_tag(self):
        request = SIPMessage(SAMPLE_INVITE)
        response = SIPResponseBuilder.build_response(request, 200, "OK", to_tag="my-tag")
        assert "SIP/2.0 200 OK" in response
        assert "tag=my-tag" in response

    def test_build_response_with_body(self):
        request = SIPMessage(SAMPLE_INVITE)
        sdp = "v=0\r\no=test\r\n"
        response = SIPResponseBuilder.build_response(
            request,
            200,
            "OK",
            body=sdp,
            extra_headers={"Content-Type": "application/sdp"},
        )
        assert "Content-Type: application/sdp" in response
        assert f"Content-Length: {len(sdp)}" in response

    def test_via_rport_processing(self):
        request = SIPMessage(SAMPLE_INVITE)
        response = SIPResponseBuilder.build_response(
            request,
            200,
            "OK",
            remote_addr=("10.0.0.1", 12345),
        )
        # Should have rport populated
        assert "rport=12345" in response
        assert "received=10.0.0.1" in response

    def test_get_response_destination_with_received(self):
        raw = (
            "INVITE sip:agent@localhost SIP/2.0\r\n"
            "Via: SIP/2.0/UDP proxy.example.com;branch=z9hG4bK;received=10.0.0.1;rport=5060\r\n"
            "Call-ID: test\r\n"
            "\r\n"
        )
        request = SIPMessage(raw)
        dest = SIPResponseBuilder.get_response_destination(request, ("192.168.1.1", 5060))
        assert dest[0] == "10.0.0.1"

    def test_get_response_destination_bare_rport(self):
        raw = (
            "INVITE sip:agent@localhost SIP/2.0\r\n"
            "Via: SIP/2.0/UDP proxy.example.com;branch=z9hG4bK;rport\r\n"
            "Call-ID: test\r\n"
            "\r\n"
        )
        request = SIPMessage(raw)
        dest = SIPResponseBuilder.get_response_destination(request, ("10.0.0.5", 9999))
        # With bare rport, should use source address
        assert dest == ("10.0.0.5", 9999)

    def test_build_response_preserves_record_route(self):
        raw = (
            "INVITE sip:agent@localhost SIP/2.0\r\n"
            "Via: SIP/2.0/UDP host\r\n"
            "Record-Route: <sip:proxy1@example.com;lr>\r\n"
            "From: <sip:user@example.com>;tag=abc\r\n"
            "To: <sip:agent@localhost>\r\n"
            "Call-ID: test\r\n"
            "CSeq: 1 INVITE\r\n"
            "\r\n"
        )
        request = SIPMessage(raw)
        response = SIPResponseBuilder.build_response(request, 200, "OK")
        assert "Record-Route: <sip:proxy1@example.com;lr>" in response


class TestSIPRequestBuilder:
    def test_build_bye(self):
        invite = SIPMessage(SAMPLE_INVITE)
        bye = SIPRequestBuilder.build_bye(
            invite=invite,
            local_tag="my-tag",
            server_host="agent.example.com",
        )
        assert bye.startswith("BYE ")
        assert "CSeq:" in bye
        assert "Call-ID: a84b4c76e66710@provider.com" in bye
