# SmartEdX — Ports & Network Reference

## Application Services

| Service | Port | Protocol | URL | Notes |
|---|---|---|---|---|
| API Gateway | 5001 | HTTP + WS | `http://localhost:5001` | Single client entry point |
| SaaS Service | 5002 | HTTP | `http://localhost:5002` | Internal only |
| Institute Service | 5003 | HTTP + WS | `http://localhost:5003` | Internal only; WS for Socket.IO |
| AI Core | 8001 | HTTP | `http://localhost:8001` | Internal only |
| Voice Agent | 8002 | HTTP + WS | `http://localhost:8002` | HTTP + Gemini Live WS |
| Facial Recognition | 8003 | HTTP | `http://localhost:8003` | Internal only |
| Institute Portal | 3001 | HTTP | `http://localhost:3001` | Next.js frontend |
| SaaS Portal | 3000 | HTTP | `http://localhost:3000` | Next.js frontend |

## Infrastructure Services (Docker Compose)

| Service | Port | Protocol | Notes |
|---|---|---|---|
| PostgreSQL | 5432 | TCP | Primary relational database |
| Redis | 6379 | TCP | Response cache |
| MinIO API | 9000 | HTTP (S3) | Object storage API |
| MinIO Console | 9001 | HTTP | MinIO web UI |
| Qdrant HTTP | 6333 | HTTP | Vector DB REST API |
| Qdrant gRPC | 6334 | gRPC | Vector DB gRPC API |

## Voice Agent SIP (Optional)

| Service | Port | Protocol | Notes |
|---|---|---|---|
| Voice Agent SIP | 5060 | UDP | SIP/VoIP telephony endpoint |

## Socket.IO Namespaces (Institute Service :5003)

| Namespace | Purpose | Auth |
|---|---|---|
| `/live` | Live class real-time events (join/leave/WebRTC signals) | JWT |
| `/messages` | Real-time message delivery | JWT |
| `/notifications` | Push notifications | JWT |

## Network Access Summary

```
External (browsers):
  → API Gateway :5001     (HTTP + WebSocket)
  → Institute Portal :3001 (Next.js)
  → SaaS Portal :3000      (Next.js)

Internal (service-to-service):
  API Gateway   → SaaS Service :5002
  API Gateway   → Institute Service :5003
  API Gateway   → AI Core :8001
  API Gateway   → Voice Agent :8002
  Inst. Service → AI Core :8001
  Inst. Service → Face Rec :8003
  Inst. Service → Voice Agent :8002
  Voice Agent   → Institute Service :5003
  Voice Agent   → AI Core :8001
  Voice Agent   → Qdrant :6333

Infrastructure (accessed by NestJS services):
  All NestJS    → PostgreSQL :5432
  All NestJS    → Redis :6379
  All services  → MinIO :9000
```
