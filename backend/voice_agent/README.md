# Articom Voice Agent Service

![tests](https://img.shields.io/badge/tests-82%20passed-brightgreen)
![coverage](https://img.shields.io/badge/coverage-46%25-yellow)
![python](https://img.shields.io/badge/python-3.13%2B-blue)
![license](https://img.shields.io/badge/license-Apache--2.0-blue)
![version](https://img.shields.io/badge/version-0.1.0-informational)

Production-ready real-time voice agent service built on **Google ADK** (Agent Development Kit) with three transport layers: browser WebSocket, SIP-over-WebSocket (Kamailio), and native SIP/UDP. Uses Gemini live streaming for bidirectional audio.

## Overview

Articom Voice Agent Service provides a scalable, real-time voice interaction platform that integrates Google Gemini AI models with telephony systems. The service supports bidirectional streaming audio through multiple transport mediums simultaneously.

### Key Features

- **Real-time Voice Conversations** -- Bidirectional streaming with Google ADK using Gemini native audio models
- **Three Transport Layers** -- Browser WebSocket, SIP-over-WebSocket (Kamailio), and native SIP/UDP
- **Audio Codec Conversion** -- Automatic transcoding between G.711 (8 kHz) and PCM (16/24 kHz) with stateful resampling
- **Articom Assistant Integration** -- Fetches custom voice instructions, greetings, and configurations from Articom Core API
- **Dynamic Custom Tools** -- HMAC-signed HTTP tool manifests loaded at runtime
- **Vector Knowledge Base** -- Optional Qdrant-backed retrieval for agent context
- **Langfuse Observability** -- Optional tracing with OpenTelemetry and Langfuse
- **CLI Interface** -- Full command-line control over transports, model, networking, and feature flags
- **Web Dashboard** -- Built-in dashboard and voice simulator for testing
- **Concurrent Call Handling** -- Multiple simultaneous sessions across all transports

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  SIP Provider   │     │  Native SIP/UDP  │     │  Google ADK     │
│  (Kamailio)     │<UDP─│  (5060 + 20000)  │<────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               v
┌─────────────────┐     ┌──────────────────┐
│  Web Client     │────>│  WebSocket       │
│  (Browser)      │<────│  Endpoint        │
└─────────────────┘     └──────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.13 or higher
- Google Cloud API key or Vertex AI credentials
- (Optional) Articom API credentials for custom assistant configuration
- (Optional) SIP trunk provider for telephony integration

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd articom-voice-agent-service-v2
   ```

2. **Install dependencies using uv** (recommended):
   ```bash
   pip install uv
   uv sync
   ```

   Or using pip:
   ```bash
   pip install -e .
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example app/.env
   ```

4. **Configure API keys** in `app/.env`:
   ```bash
   GOOGLE_API_KEY=your_google_api_key_here
   ARTICOM_ASSISTANT_ID=your_assistant_id       # optional
   ARTICOM_API_KEY=your_articom_api_key         # optional
   ```

5. **Run the service:**
   ```bash
   # Using the CLI (recommended)
   articom-voice-agent

   # Or with uvicorn directly
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

6. **Access the dashboard:**
   Open http://localhost:8000 in your browser. The voice simulator is available at http://localhost:8000/simulator.

---

## CLI Usage

The service includes a full CLI for controlling transports, networking, model selection, and feature flags.

```bash
articom-voice-agent [OPTIONS]
```

### Transport Selection

```bash
# Enable specific transports (can combine multiple -t flags)
articom-voice-agent -t websocket
articom-voice-agent -t sip-udp -t sip-ws
articom-voice-agent -t all                  # enable all transports (default)
```

Available transports: `websocket`, `sip-ws`, `sip-udp`, `all`

### Networking

```bash
articom-voice-agent -H 0.0.0.0 -p 8080     # HTTP bind address and port
articom-voice-agent --sip-port 5080         # SIP/UDP listen port
articom-voice-agent --sip-host sip.example.com  # SIP server host for SDP
```

### Model and Agent

```bash
articom-voice-agent -m gemini-2.5-flash-native-audio-preview-12-2025
articom-voice-agent --assistant-id your_id
articom-voice-agent --vertex                # use Vertex AI
articom-voice-agent --no-vertex             # use Gemini API
```

### Feature Flags

```bash
articom-voice-agent --langfuse              # enable Langfuse tracing
articom-voice-agent --custom-tools          # enable custom HTTP tools
articom-voice-agent --kb                    # enable Qdrant knowledge base
```

### Development

```bash
articom-voice-agent --reload -l debug       # auto-reload with debug logging
articom-voice-agent --workers 4             # multiple uvicorn workers
```

---

## Configuration

All environment variables are centralized in `app/config.py`. Never use `os.getenv()` directly in other modules.

### Google AI (Required)

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_API_KEY` | `""` | Gemini API key |
| `GOOGLE_GENAI_USE_VERTEXAI` | `false` | Use Vertex AI instead of Gemini API |
| `GOOGLE_CLOUD_PROJECT` | `""` | GCP project ID (Vertex AI) |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` | GCP region (Vertex AI) |
| `GOOGLE_APPLICATION_CREDENTIALS` | `""` | Path to service account JSON |

### Articom API

| Variable | Default | Description |
|----------|---------|-------------|
| `ARTICOM_ASSISTANT_ID` | `""` | Assistant ID for config fetch |
| `ARTICOM_API_KEY` | `""` | Articom API key |
| `SERVER_API` | `""` | Articom API server URL |
| `SERVER_CORE` | `""` | Articom Core server URL |

### Agent / Model

| Variable | Default | Description |
|----------|---------|-------------|
| `DEMO_AGENT_MODEL` | `gemini-2.5-flash-native-audio-preview-12-2025` | Gemini model name |

Supported model types:
- **Native Audio Models** (`*native-audio*`) -- AUDIO response modality with proactivity and affective dialog
- **Half-cascade Models** (all others) -- TEXT response modality, auto-detected by `RunConfigFactory`

### Custom Tools

| Variable | Default | Description |
|----------|---------|-------------|
| `CUSTOM_TOOLS_ENABLED` | `false` | Enable dynamic HTTP tool loading |
| `ARTICOM_MANIFEST_URL` | — | URL for HMAC-signed tool manifest |
| `ARTICOM_TOOLS_SECRET` | — | HMAC secret for manifest verification |

### Knowledge Base (Qdrant)

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_KB_ENABLED` | `false` | Enable vector knowledge base |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant server URL |
| `QDRANT_COLLECTION_NAME` | `dp_instructions_kb` | Collection name |
| `QDRANT_API_KEY` | `""` | Qdrant API key |

### Langfuse / Observability

| Variable | Default | Description |
|----------|---------|-------------|
| `LANGFUSE_ENABLED` | `false` | Enable Langfuse tracing |
| `LANGFUSE_SECRET_KEY` | `""` | Langfuse secret key |
| `LANGFUSE_PUBLIC_KEY` | `""` | Langfuse public key |
| `LANGFUSE_BASE_URL` | `""` | Langfuse server URL |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `""` | OpenTelemetry OTLP endpoint |
| `OTEL_EXPORTER_OTLP_HEADERS` | `""` | OTLP authentication headers |

### SIP / Telephony

| Variable | Default | Description |
|----------|---------|-------------|
| `SIP_ENABLED` | `true` | Enable native SIP/UDP server |
| `SIP_PORT` | `5060` | SIP signaling port (UDP) |
| `SIP_SDP_PORT` | `20000` | RTP audio port |
| `SIP_BIND_ADDRESS` | `0.0.0.0` | SIP bind address |
| `SIP_SERVER_HOST` | `localhost` | Host for SIP Contact header |
| `SIP_SDP_HOST` | `127.0.0.1` | Public IP for SDP c= line |
| `POD_IP` | `""` | Kubernetes pod IP (overrides SDP host) |
| `SIP_USE_RTP` | `false` | RTP parsing for WebSocket SIP mode |
| `SIP_AUDIO_GAIN` | `3.0` | Amplification for SIP inbound audio |

### Transport Selection

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT_WEBSOCKET` | `true` | Enable browser WebSocket transport |
| `TRANSPORT_SIP_WS` | `false` | Enable SIP-over-WebSocket transport |

### Audio / Barge-in

| Variable | Default | Description |
|----------|---------|-------------|
| `HARD_MUTE_SECONDS` | `2.5` | Suppress agent audio after barge-in |
| `SILENCE_FLUSH_MS` | `1500` | Silence duration to flush audio buffer |
| `INTERRUPT_SILENCE_MS` | `500` | Silence threshold for interrupt detection |
| `SILENCE_END_FRAMES` | `75` | Silence frames for end-of-speech |
| `INTERRUPT_TIMEOUT_SECONDS` | `8.0` | Timeout for stuck interrupt state |
| `MIN_USER_TURNS_BEFORE_END_CALL` | `3` | Minimum user turns before allowing end_call |

---

## API Endpoints

### HTTP

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Dashboard UI |
| `GET` | `/simulator` | Voice agent simulator |
| `GET` | `/health` | Health check with SIP server status |

### WebSocket

#### `WS /ws/{user_id}/{session_id}`

Browser WebSocket endpoint for web-based voice interactions.

**Path parameters:**
- `user_id` -- Unique user identifier
- `session_id` -- Session identifier for conversation continuity

**Query parameters (optional):**
- `proactivity` -- Enable proactive audio (native audio models only)
- `affective_dialog` -- Enable affective dialog (native audio models only)

**Message format:**
- Inbound binary: PCM audio (16 kHz, 16-bit, mono)
- Inbound text: JSON commands (e.g., `{"type": "setup_complete"}`)
- Outbound binary: PCM audio (16 kHz, 16-bit, mono)
- Outbound text: JSON with transcriptions and metadata

#### `WS /sip`

SIP-over-WebSocket endpoint for Kamailio proxy integration (RFC 3261 / RFC 7118).

Supported codecs: G.711 u-law (PCMU, PT 0) and G.711 a-law (PCMA, PT 8).

---

## Project Structure

```
app/
├── main.py                        # FastAPI entrypoint, mounts routes and lifespan
├── cli.py                         # CLI entry point with transport/model/feature args
├── config.py                      # Centralized env-var configuration (single source of truth)
├── latency.py                     # Latency tracking
├── agent/                         # ADK agent definition and Articom Core API client
│   ├── agent.py                   # Agent instance, system instructions, tools
│   ├── api.py                     # Articom Core REST API (start/end session, fetch config)
│   └── custom_tools.py            # Dynamic HTTP tool loading via HMAC-signed manifests
├── adk/                           # ADK session orchestration (shared across transports)
│   ├── session_manager.py         # ADKSessionManager -- initialize/finalize lifecycle
│   └── run_config_factory.py      # RunConfig builder (native-audio vs half-cascade)
├── audio/                         # Audio codec conversion (transport-agnostic)
│   └── codec.py                   # G.711 u-law/a-law <-> PCM with stateful resampling
├── sip/                           # SIP protocol layer (transport-agnostic)
│   ├── parser.py                  # SIPMessage, SIPResponseBuilder, SIPRequestBuilder
│   └── rtp.py                     # RTPPacket, parse/create helpers
├── observability/                 # Langfuse tracing (single integration point)
│   └── langfuse_client.py         # observe_decorator, get_langfuse, update_trace/generation
├── transport/                     # Transport handlers
│   ├── websocket/handler.py       # Browser WebSocket (audio/text/image -> ADK -> events)
│   ├── sip_websocket/handler.py   # SIP-over-WS (Kamailio proxy, generate-then-speak)
│   └── sip_udp/                   # Native SIP/UDP
│       ├── call_session.py        # SIPCallInfo dataclass
│       └── server.py              # NativeSIPServer, RTP pacing, SIP signaling
├── transcription/                 # Transcript recording from ADK events
│   └── handler.py                 # TranscriptHandler
└── static/                        # Web UI (dashboard + voice simulator)
```

## Audio Processing

### Audio Formats

| Source | Format | Sample Rate | Bit Depth | Channels |
|--------|--------|-------------|-----------|----------|
| Web Client | PCM | 16 kHz | 16-bit | Mono |
| SIP Provider | G.711 u-law/a-law | 8 kHz | 8-bit | Mono |
| Google ADK (input) | PCM | 16 kHz | 16-bit | Mono |
| Google ADK (output) | PCM | 24 kHz | 16-bit | Mono |

### Codec Conversion Pipeline

**Inbound (SIP to ADK):**
1. Receive RTP packet on UDP port 20000
2. Parse RTP header, extract G.711 payload
3. Decode G.711 to PCM at 8 kHz
4. Resample to PCM at 16 kHz
5. Apply gain (`SIP_AUDIO_GAIN`)
6. Send to Google ADK

**Outbound (ADK to SIP):**
1. Receive PCM at 24 kHz from Gemini
2. Resample to PCM at 8 kHz
3. Encode to G.711
4. Split into 20 ms RTP chunks (160 bytes)
5. Paced delivery at 20 ms intervals via UDP

## Transport Differences

| Feature | WebSocket | SIP-over-WS | SIP/UDP |
|---------|-----------|-------------|---------|
| Audio format | PCM 16 kHz | G.711 <-> PCM | G.711 <-> PCM |
| Barge-in | ADK VAD | asyncio.Event | Interrupt flag + hard mute |
| Audio delivery | Direct stream | Generate-then-speak buffer | RTP pacing queue |
| Session init | ADKSessionManager | ADKSessionManager | Manual (complex) |
| End call | Client disconnect | BYE over WS | BYE over UDP + retransmit |

---

## Docker Deployment

### Build

```bash
docker build -t articom-voice-agent:latest .
```

### Run

```bash
docker run -d \
  -p 8000:8000 \
  -p 5060:5060/udp \
  -p 20000:20000/udp \
  -e GOOGLE_API_KEY=your_api_key \
  -e ARTICOM_ASSISTANT_ID=your_assistant_id \
  -e ARTICOM_API_KEY=your_articom_key \
  --name articom-voice-agent \
  articom-voice-agent:latest
```

Or use an env file:

```bash
docker run -d \
  -p 8000:8000 \
  -p 5060:5060/udp \
  -p 20000:20000/udp \
  --env-file app/.env \
  --name articom-voice-agent \
  articom-voice-agent:latest
```

---

## Testing

### Run all tests

```bash
pytest tests/ -v --cov=app --cov-report=term-missing
```

### Unit tests only

```bash
pytest tests/unit/ -v
```

### Web interface testing

1. Start the service: `uvicorn app.main:app --host 127.0.0.1 --port 8000`
2. Open http://localhost:8000/simulator
3. Use the built-in voice recorder to test interactions

### SIP integration testing

```bash
python scripts/test_sip_client.py
```

---

## Development

### Install with dev dependencies

```bash
uv sync
pip install -e ".[dev]"
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| google-adk | >= 1.26.0 | Google Agent Development Kit |
| fastapi | >= 0.115.0 | Web framework and WebSocket handling |
| uvicorn | >= 0.32.0 | ASGI server |
| google-genai | >= 1.61.0 | Gemini API client |
| langfuse | 3.14.1 | Observability and tracing |
| openinference-instrumentation-google-adk | >= 0.1.9 | ADK OpenTelemetry instrumentation |
| numpy | >= 1.26.0 | Audio processing |
| audioop-lts | >= 0.2.1 | G.711 codec support |
| fastembed | latest | Embedding for knowledge base |
| mcp | >= 1.0.0 | Model Context Protocol |

### Session Management

- Uses `InMemorySessionService` for session state
- Sessions identified by `user_id` and `session_id`
- Supports session resumption for continued conversations
- Each SIP call creates a unique session with `sip-{from_tag}` user ID

---

## Security Considerations

1. **API Keys** -- Never commit `.env` files with real credentials
2. **Public IP** -- Ensure `SIP_SDP_HOST` is accessible but secured
3. **TLS** -- Use HTTPS and WSS in production
4. **Authentication** -- Implement authentication for production deployments
5. **Rate Limiting** -- Add rate limiting for public-facing API endpoints

## Troubleshooting

**Google API key not configured**
- Verify `GOOGLE_API_KEY` is set in `app/.env`
- Confirm the `.env` file is located in the `app/` directory

**SIP calls not connecting**
- Verify `SIP_SERVER_HOST` is reachable by your SIP provider
- Confirm `SIP_SDP_HOST` matches your server's public IP
- Ensure ports 5060/UDP and 20000/UDP are open

**No audio in SIP calls**
- Check codec compatibility (PCMU/PCMA)
- Verify `SIP_AUDIO_GAIN` is non-zero
- Confirm network connectivity and firewall rules

**WebSocket connection errors**
- Check browser console for detailed error output
- Verify microphone permissions
- Confirm the WebSocket URL format: `ws://host:port/ws/{user_id}/{session_id}`

**Debug logging:**
```bash
articom-voice-agent -l debug
# or
uvicorn app.main:app --log-level debug
```

---

## License

Apache-2.0

## Authors

- Articom Development Team
- [Google ADK Documentation](https://cloud.google.com/agent-development-kit)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
