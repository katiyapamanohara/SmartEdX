# SmartEdX — Architecture

## Overview

SmartEdX is a **multi-tenant SaaS LMS (Learning Management System)** built as a microservices monorepo. All services are developed independently, communicate over HTTP (REST + WebSocket), and are unified behind a single API Gateway. Infrastructure services (PostgreSQL, Redis, MinIO, Qdrant) run via Docker Compose.

---

## High-Level System Diagram

```
                    ┌──────────────────────────────────────────┐
                    │              Client Browsers              │
                    │                                          │
                    │   Institute Portal       SaaS Portal     │
                    │   Next.js :3001          Next.js :3000   │
                    └──────────────────┬───────────────────────┘
                                       │  HTTP / WebSocket
                    ┌──────────────────▼───────────────────────┐
                    │            API Gateway  :5001             │
                    │       (NestJS — http-proxy-middleware)    │
                    │                                          │
                    │  /api/auth/*       → SaaS Svc    :5002  │
                    │  /api/institutes/* → Inst Svc    :5003  │
                    │  /api/ai/*         → AI Core     :8001  │
                    │  /api/voice-agent/ → Voice Agent :8002  │
                    │  WS /voice-agent/  → Voice WS    :8002  │
                    └──┬──────────┬──────────────┬────────────┘
                       │          │              │
         ┌─────────────▼──┐  ┌────▼──────────┐  │
         │  SaaS Service  │  │ Inst. Service │  │
         │  NestJS :5002  │  │ NestJS :5003  │  │
         │                │  │               │  │
         │ · Auth/JWT     │  │ · Courses     │  │
         │ · Firebase     │  │ · Exams       │  │
         │ · Institutes   │  │ · Recordings  │  │
         │ · Subscriptions│  │ · Live Classes│  │
         │ · Payments     │  │ · Messages    │  │
         │ · Users/Roles  │  │ · Notifications│  │
         └────────┬───────┘  └───────┬───────┘  │
                  │                  │           │
                  └────────┬─────────┘           │
                           │                     │
                ┌──────────▼──────────┐          │
                │   PostgreSQL :5432  │          │
                │  (shared instance)  │          │
                │  db: saas_service   │          │
                │  db: institute_svc  │          │
                └─────────────────────┘          │
                                                 │
                ┌──────────────────┐   ┌─────────▼──────────┐
                │  AI Core :8001   │   │  Voice Agent :8002 │
                │  FastAPI + Agno  │   │  FastAPI+Gemini Live│
                │                  │   │                    │
                │ · Quiz Gen       │   │ · Institute AI     │
                │ · Chat Agents    │   │ · Teacher AI       │
                │ · Transcription  │   │ · Course Q&A       │
                │ · Teacher Tools  │   │ · SIP/VoIP support │
                │ · Screen Monitor │   └──────────┬─────────┘
                │ · Essay Grading  │              │
                └──────────┬───────┘              │
                           │                      │
                ┌──────────▼──────────────────────▼──────────┐
                │            LLM Provider APIs                │
                │  Anthropic Claude · OpenAI GPT · Gemini     │
                └─────────────────────────────────────────────┘

     ┌─────────────────────────────────────────────────────────┐
     │               Infrastructure (Docker Compose)           │
     │                                                         │
     │  MinIO :9000      Redis :6379      Qdrant :6333         │
     │  (S3 Object       (Response        (Vector DB           │
     │   Storage)         Cache)           for KB search)      │
     └─────────────────────────────────────────────────────────┘

     ┌────────────────────────────────┐
     │  Face Recognition Server :8003 │
     │  FastAPI + DeepFace            │
     │  (Facenet512, cosine ≤ 0.30)   │
     └────────────────────────────────┘
```

---

## Service Communication Matrix

| Caller | Calls | Via |
|---|---|---|
| Frontend portals | API Gateway | HTTP/WebSocket |
| API Gateway | SaaS Service | HTTP reverse proxy |
| API Gateway | Institute Service | HTTP reverse proxy |
| API Gateway | AI Core | HTTP reverse proxy |
| API Gateway | Voice Agent | HTTP + WS reverse proxy |
| Institute Service | AI Core | Internal HTTP (`AI_CORE_URL`) |
| Institute Service | Face Recognition Server | Internal HTTP (`FACE_REC_URL`) |
| Institute Service | Voice Agent | Internal HTTP (`VOICE_AGENT_URL`) |
| Voice Agent | Institute Service | Internal HTTP |
| Voice Agent | AI Core | Internal HTTP |
| Voice Agent | Qdrant | TCP :6333 |
| AI Core / Inst. Service | MinIO | S3 API :9000 |
| SaaS / Inst. Service | PostgreSQL | TypeORM TCP :5432 |
| SaaS / Inst. Service | Redis | ioredis TCP :6379 |

---

## Authentication Flow

```
Browser             API Gateway       SaaS/Inst Service      Firebase
  │                     │                   │                    │
  │─ POST /auth/login ──▶│                   │                    │
  │                     │── forward ────────▶│                    │
  │                     │                   │── verifyIdToken ───▶│
  │                     │                   │◀── UID + claims ────│
  │                     │                   │── lookup DB user    │
  │                     │                   │── sign JWT          │
  │◀── { accessToken } ─│◀── JWT ───────────│                    │
  │                     │                   │                    │
  │─ GET /api/... ───────▶│  (Bearer: JWT)   │                    │
  │                     │── proxy + JWT ────▶│                    │
  │                     │                   │── JwtAuthGuard      │
  │                     │                   │── verify + attach   │
```

---

## File Upload → Knowledge Base Flow

```
Teacher uploads PDF/DOCX/PPTX
        │
        ▼
Institute Service
  POST .../contents/upload-file
        │
        ├── Store binary in MinIO → return URL
        │
        └── Call Voice Agent to index content
                  │
                  ├── Extract text from document
                  ├── Generate embeddings (FastEmbed all-MiniLM-L6-v2)
                  └── Upsert vectors into Qdrant (collection: course_kb)

Student searches:
  POST .../kb-search { query }
        │
        └── Qdrant ANN search → top-k chunks → returned to student
```

---

## Exam Proctoring Flow

```
Student starts exam
        │
        ├── [requireFaceId] POST /auth/me/face/verify
        │         └── webcam → DeepFace Facenet512 → pass/fail
        │
        ├── [requireScreenShare] browser getDisplayMedia()
        │
        │  During exam (polling)
        │
        ├── [enableLiveFaceCheck, ~60s interval]
        │         POST /exams/:id/live-face-check
        │         └── Frame → Face Rec Server → flag if mismatch
        │
        ├── [requireScreenShare, periodic]
        │         POST /exams/:id/screen-check
        │         └── Screenshot → AI Core vision → flag if dishonesty
        │
        ├── Browser events (tab_switch, fullscreen_exit, copy_attempt)
        │         POST /exams/:id/integrity-flag
        │
        └── [autoFailOnCheat && high-severity flags ≥ 3]
                  Exam auto-failed
```

---

## Monorepo Structure

```
SmartEdX/
├── api-gateway/                   # NestJS — HTTP/WS entry point
│   └── src/modules/
│       ├── proxy/                 # Route proxying rules
│       ├── student/               # Student proxy module
│       └── teacher/               # Teacher proxy module
│
├── backend/
│   ├── saas_service/              # NestJS — SaaS platform management
│   │   └── src/modules/
│   │       ├── auth/              # Users, institutes, roles, JWT
│   │       ├── subscription/      # Plan/billing management
│   │       └── payhere/           # Payment gateway integration
│   │
│   ├── institute_service/         # NestJS — all LMS features
│   │   └── src/modules/
│   │       ├── auth/              # Institute users, roles, face ID
│   │       ├── courses/           # Courses, modules, content
│   │       ├── exams/             # Exams, proctoring, integrity
│   │       ├── recordings/        # Video management, video quiz
│   │       ├── live/              # Live class sessions
│   │       ├── messages/          # Direct messaging
│   │       ├── notifications/     # Push notifications
│   │       └── gateway/           # Socket.IO gateways
│   │
│   ├── ai_core/                   # FastAPI + Agno — AI features
│   │   └── routers/
│   │       ├── quiz.py            # Quiz generation
│   │       ├── chat.py            # AI chat agents
│   │       ├── screen.py          # Screen analysis
│   │       ├── teacher_tools.py   # Lesson plans, grading, insights
│   │       ├── transcription.py   # Audio → text
│   │       └── voice_assessment.py
│   │
│   ├── facial_recognition_server/ # FastAPI + DeepFace
│   │   └── routers/face.py
│   │
│   └── voice_agent/               # FastAPI + Google ADK + Gemini Live
│       └── app/
│           ├── agents/            # General, teacher, course-qa configs
│           └── routers/           # KB search, course-kb, session
│
├── frontend/
│   ├── institute_protal/          # Next.js 16 — teachers, students, admins
│   │   └── src/
│   │       ├── app/[instituteId]/ # Role-based route groups
│   │       ├── components/        # Shared UI components
│   │       └── context/           # Auth, socket, notifications
│   │
│   └── sass_protal/               # Next.js 16 — SaaS operator/admin
│       └── src/app/
│
├── docs/                          # Project documentation
│   ├── ARCHITECTURE.md            # This file
│   ├── DATABASE.md                # Full DB schema + ER diagrams
│   ├── API.md                     # All REST/WS endpoints
│   ├── FEATURES.md                # Feature catalogue
│   ├── SERVICES.md                # Per-service reference
│   ├── ENVIRONMENT.md             # Environment variables
│   ├── PORTS.md                   # Port assignments
│   └── GETTING_STARTED.md         # Local dev setup
│
└── docker-compose.yml             # MinIO, Redis, Qdrant
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| API Gateway | NestJS 11 + TypeScript |
| SaaS Backend | NestJS 11 + TypeScript + TypeORM |
| Institute Backend | NestJS 11 + TypeScript + TypeORM |
| AI Core | Python 3.11 + FastAPI + Agno |
| Voice Agent | Python 3.11 + FastAPI + Google ADK |
| Face Recognition | Python 3.11 + FastAPI + DeepFace |
| Primary Database | PostgreSQL 15 |
| Cache | Redis Alpine (maxmem 100MB, allkeys-lru) |
| Object Storage | MinIO (S3-compatible, `smartedx-bucket`) |
| Vector Database | Qdrant (collection: `course_kb`) |
| Frontend (both) | Next.js 16 + React 19 + TypeScript + TailwindCSS 4 |
| Auth — Identity | Firebase (Google Identity Platform) |
| Auth — Service | JWT / Passport.js (RS256) |
| Real-time | Socket.IO (NestJS gateways) |
| AI Providers | Anthropic Claude · OpenAI GPT · Google Gemini |
| Face Model | DeepFace Facenet512 (512-d embeddings) |
| Embeddings | FastEmbed all-MiniLM-L6-v2-onnx |
| Payments | PayHere (Sri Lanka) |
| Charts | ApexCharts + react-apexcharts |
| Calendar | FullCalendar 6 |
