# SmartEdX — Ports & Network Reference

## Application Services

| Service | Port | Protocol | URL | Notes |
|---------|------|----------|-----|-------|
| SaaS Admin Portal | 3000 | HTTP | http://localhost:3000 | Next.js frontend for SaaS operators |
| Institute Portal | 3001 | HTTP | http://localhost:3001 | Next.js frontend for teachers, students, admins |
| API Gateway | 5001 | HTTP + WS | http://localhost:5001 | Single entry point for all clients |
| SaaS Service | 5002 | HTTP | http://localhost:5002 | Auth, tenants, global user management |
| Institute Service | 5003 | HTTP + WS | http://localhost:5003 | Courses, exams, live sessions, recordings |
| AI Core | 8001 | HTTP | http://localhost:8001 | Quiz generation, chat agents |
| Voice Agent | 8002 | HTTP + WS | http://localhost:8002 | Real-time voice learning (Gemini Live) |
| Facial Recognition | 8003 | HTTP | http://localhost:8003 | Face enrollment and exam verification |

## Infrastructure Services

| Service | Port | Protocol | URL | Purpose |
|---------|------|----------|-----|---------|
| PostgreSQL | 5432 | TCP | localhost:5432 | Primary relational database |
| Redis | 6379 | TCP | localhost:6379 | Session cache, real-time state |
| MinIO API | 9000 | HTTP | http://localhost:9000 | S3-compatible object storage API |
| MinIO Console | 9001 | HTTP | http://localhost:9001 | MinIO web admin UI |
| Qdrant HTTP | 6333 | HTTP | http://localhost:6333 | Vector DB REST API |
| Qdrant gRPC | 6334 | gRPC | localhost:6334 | Vector DB gRPC API |

## API Documentation (Swagger)

Each service exposes Swagger UI when running in development:

| Service | Swagger URL |
|---------|-------------|
| API Gateway | http://localhost:5001/docs |
| SaaS Service | http://localhost:5002/docs |
| Institute Service | http://localhost:5003/docs |
| AI Core | http://localhost:8001/docs |
| Voice Agent | http://localhost:8002/docs |
| Facial Recognition | http://localhost:8003/docs |

## WebSocket Endpoints

| Endpoint | Port | Used By | Purpose |
|----------|------|---------|---------|
| `/voice-agent` | 5001 | Institute Portal | Proxied WS to Voice Agent |
| `/api/voice-agent` | 5001 | Institute Portal | Voice agent HTTP + WS |
| Socket.IO | 5003 | Institute Portal | Live sessions, notifications |

## Voice Agent — SIP Ports (VoIP)

| Port | Protocol | Purpose |
|------|----------|---------|
| 5060 | UDP / TCP | SIP signalling (standard SIP port) |
| 20000+ | UDP | RTP audio media streams |

## Service-to-Service Communication

All internal service calls go through direct HTTP (not via the API Gateway):

```
API Gateway     → SaaS Service          http://localhost:5002
API Gateway     → Institute Service     http://localhost:5003
API Gateway     → AI Core              http://localhost:8001
API Gateway     → Voice Agent (WS)     http://localhost:8002

Voice Agent     → Institute Service     http://localhost:5003   (voice sessions)
Voice Agent     → AI Core              http://localhost:8001   (voice assessment)
Voice Agent     → MinIO                http://localhost:9000   (file fetch)
Voice Agent     → Qdrant               http://localhost:6333   (KB search)

Institute Svc   → Facial Rec           http://localhost:8003   (face verify)
Institute Svc   → AI Core              http://localhost:8001   (quiz generation)
Institute Svc   → MinIO                http://localhost:9000   (file upload/download)
Institute Svc   → Redis                redis://localhost:6379  (cache)

AI Core         → MinIO                http://localhost:9000   (document fetch)
```

## Frontend Environment

The frontend uses a single environment variable for all API calls:

```
NEXT_PUBLIC_API_URL=http://localhost:5001
```

All API calls from the browser go to the API Gateway at `:5001`, which routes them to the appropriate backend service.

## Port Conflict Notes

- Ports 3000 and 3001 are used by Next.js dev servers. If either is occupied, Next.js will auto-increment (`3002`, etc.).
- The Institute Service has voice session endpoints excluded from the global prefix so the Voice Agent can call them directly without going through the gateway:
  - `POST /api/session/voice/start`
  - `POST /api/session/voice/end`
