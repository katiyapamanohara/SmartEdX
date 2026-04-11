# SmartEdX — Architecture

## Overview

SmartEdX is a **microservices monorepo**. All services are developed independently, communicate over HTTP (REST + WebSocket), and are unified behind a single API Gateway. Infrastructure services (database, cache, object storage, vector DB) run via Docker Compose.

---

## System Diagram

```
                        ┌──────────────────────────────────────┐
                        │           Client Browsers            │
                        │                                      │
                        │  Institute Portal   SaaS Portal      │
                        │     Next.js :3001    Next.js :3000   │
                        └──────────────┬───────────────────────┘
                                       │
                              HTTP / WebSocket
                                       │
                        ┌──────────────▼───────────────────────┐
                        │          API Gateway  :5001           │
                        │                                       │
                        │  /api/auth        → SaaS Svc  :5002  │
                        │  /api/institutes  → Inst Svc  :5003  │
                        │  /api/ai          → AI Core   :8001  │
                        │  /api/voice-agent → Voice WS  :8002  │
                        │  /voice-agent WS  → Voice WS  :8002  │
                        └──┬──────┬──────┬──────────────┬──────┘
                           │      │      │              │
               ┌───────────▼┐  ┌──▼──────▼──┐  ┌──────▼──────────┐
               │ SaaS Svc   │  │ Inst Svc   │  │  AI Core        │
               │ NestJS     │  │ NestJS     │  │  FastAPI/Agno   │
               │ :5002      │  │ :5003      │  │  :8001          │
               │            │  │            │  │                 │
               │ - Auth     │  │ - Courses  │  │ - Quiz Gen      │
               │ - Users    │  │ - Exams    │  │ - Transcription │
               │ - Institutes│  │ - Live Ses │  │ - Chat agents   │
               │ - Roles    │  │ - Recordings│  │ - Voice assess  │
               └─────┬──────┘  └────┬───────┘  └──────────┬──────┘
                     │              │                      │
                     └──────┬───────┘            LLM APIs (Claude
                            │                     / GPT / Gemini)
                            ▼
                     ┌─────────────┐
                     │ PostgreSQL  │
                     │   :5432     │
                     │  (shared)   │
                     └─────────────┘

          ┌───────────────────┐        ┌────────────────────────┐
          │  Voice Agent      │        │  Facial Recognition    │
          │  FastAPI + ADK    │        │  FastAPI + DeepFace    │
          │  :8002            │        │  :8003                 │
          │                   │        │                        │
          │  - Gemini Live    │        │  - Face enrollment     │
          │  - Qdrant search  │        │  - Exam verification   │
          │  - SIP / WS       │        │  - Descriptor storage  │
          │  - KB retrieval   │        │                        │
          └────────┬──────────┘        └────────────────────────┘
                   │
      ┌────────────┼─────────────────────────┐
      │            │                         │
      ▼            ▼                         ▼
  ┌───────┐   ┌─────────┐           ┌────────────┐
  │ MinIO │   │ Qdrant  │           │   Redis    │
  │ :9000 │   │ :6333   │           │  :6379     │
  │       │   │         │           │            │
  │ Files │   │ Vectors │           │ Sessions   │
  │ PDFs  │   │ Course  │           │ Cache      │
  │ Videos│   │   KB    │           │            │
  └───────┘   └─────────┘           └────────────┘
```

---

## Services

### API Gateway (`/api-gateway`)

The single entry point for all client traffic.

- **Port:** 5001
- **Tech:** NestJS 11, TypeScript
- **Responsibilities:**
  - Routes HTTP requests to the appropriate backend service
  - Proxies WebSocket connections to the Voice Agent
  - Provides a unified Swagger docs interface at `/docs`
  - Enforces gateway-level authentication secrets

**Routing table:**

| Path prefix | Target service |
|-------------|----------------|
| `/api/auth` | SaaS Service :5002 |
| `/api/institutes` | Institute Service :5003 |
| `/api/ai` | AI Core :8001 |
| `/api/voice-agent` (HTTP + WS) | Voice Agent :8002 |

---

### SaaS Service (`/backend/saas_service`)

Manages global system state: users, institutes, and tenancy.

- **Port:** 5002
- **Tech:** NestJS 11, TypeScript, TypeORM, PostgreSQL
- **Responsibilities:**
  - User registration and authentication (email/password + Firebase)
  - JWT token issuance and validation
  - Institute creation and configuration
  - Role management (global + institute-scoped)
  - User assignment to institutes

**Key entities:** `User`, `Institute`, `InstituteUser`, `InstituteRole`, `Role`

---

### Institute Service (`/backend/institute_service`)

The core educational platform logic. This is the most feature-rich service.

- **Port:** 5003
- **Tech:** NestJS 11, TypeScript, TypeORM, PostgreSQL, Socket.IO
- **Responsibilities:**
  - Course, module, and content management
  - Student and teacher management
  - Exam lifecycle: creation, scheduling, submission, grading
  - Exam integrity monitoring and violation tracking
  - Live session management (Socket.IO)
  - Video recording management with category and course assignment
  - Notification system
  - Reporting: student performance across quizzes and exams

**Key entities:** `Course`, `CourseModule`, `ModuleContent`, `Student`, `Teacher`, `Exam`, `Recording`, `LiveSession`, `LiveParticipant`, `Message`, `Notification`

**Voice endpoints** (bypass gateway, called directly by Voice Agent):
- `POST /api/session/voice/start`
- `POST /api/session/voice/end`

---

### AI Core (`/backend/ai_core`)

AI-powered content generation service built on the Agno agent framework.

- **Port:** 8001
- **Tech:** FastAPI, Python 3.11+, Agno
- **LLM Providers:** Anthropic Claude, OpenAI GPT, Google Gemini (switchable via env)
- **Responsibilities:**
  - Generate MCQ and essay quiz questions from uploaded documents or raw text
  - Provide chat assistance (teacher-mode and student-mode)
  - Transcription endpoint for audio/speech input
  - Voice assessment scoring

**Supported input formats:** PDF, DOCX, PPTX, plain text

---

### Voice Agent (`/backend/voice_agent`)

Real-time voice learning using Google Gemini Live and vector retrieval.

- **Port:** 8002
- **Tech:** FastAPI, Python 3.13+, Google ADK, Gemini Live API, Qdrant
- **Responsibilities:**
  - Host real-time voice conversations for students
  - Retrieve relevant context from course knowledge base (Qdrant)
  - Index course documents (PDF/DOCX from MinIO) into Qdrant on demand
  - Evaluate voice answers and return structured scores
  - Manage voice sessions (start/end lifecycle via Institute Service)
- **Transport protocols:** WebSocket (browser), SIP/UDP (VoIP)

---

### Facial Recognition Server (`/backend/facial_recognition_server`)

Standalone face verification microservice for exam proctoring.

- **Port:** 8003
- **Tech:** FastAPI, Python, DeepFace
- **Model:** Facenet512 (default), ArcFace, VGG-Face
- **Detector:** OpenCV (default), retinaface, mtcnn
- **Responsibilities:**
  - Enroll student faces before exams (extract 512-d descriptors)
  - Verify identity at exam entry using cosine distance (threshold: 0.30)
  - Return match/no-match with confidence distance

---

## Data Flow Examples

### Student Takes an Exam

```
Student browser
    │ POST /api/institutes/institutes/:id/exams/:examId/submit
    ▼
API Gateway :5001
    │ forward → Institute Service :5003
    ▼
Institute Service
    │ Validate JWT, check enrollment, record attempt
    │ Save score + answers in exam.studentAttempts JSONB
    ▼
PostgreSQL
```

### Face Verification at Exam Start

```
Student browser
    │ Capture webcam frame (Base64)
    │ POST /api/institutes/institutes/:id/exams/:examId/verify-face
    ▼
API Gateway :5001
    │ forward → Institute Service :5003
    ▼
Institute Service
    │ Has stored faceDescriptor? → call Face Rec service
    │ POST http://localhost:8003/verify { descriptor1, descriptor2 }
    ▼
Facial Recognition :8003
    │ Cosine distance < 0.30? → { match: true, distance: 0.18 }
    ▼
Institute Service → response to browser
```

### AI Quiz Generation

```
Teacher browser
    │ POST /api/ai/quiz/generate-from-text { text, numQuestions, difficulty }
    ▼
API Gateway :5001
    │ forward → AI Core :8001
    ▼
AI Core (Agno agent)
    │ Call Claude / GPT / Gemini → structured MCQ list
    ▼
Browser ← JSON: [{ question, options, correctAnswer, marks }]
```

### Voice Learning Session

```
Student browser (WebSocket)
    │ Connect ws://localhost:5001/voice-agent
    ▼
API Gateway :5001
    │ Proxy WS → Voice Agent :8002
    ▼
Voice Agent
    │ Open Gemini Live session
    │ Query Qdrant for course KB context
    │ Stream audio ↔ Gemini Live
    │ POST Institute Svc /api/session/voice/start (direct, no gateway)
    ▼
Gemini Live ↔ Student mic/speaker in real time
```

---

## Database Schema (high level)

```
institutes
  └── institute_users  (role-scoped users)
  └── courses
        └── teacher_courses  (join: course ↔ teacher)
        └── student_courses  (join: course ↔ student)
        └── course_modules
              └── module_contents  (videos, PDFs, quizzes)
                    └── studentAttempts  (JSONB: per-student quiz scores)
  └── exams
        └── studentAttempts  (JSONB: per-student exam scores)
        └── integrityFlags   (JSONB: violation events per student)
  └── recordings
        └── recording_categories
        └── recording_course_assignments
        └── videoQuestions   (JSONB: timed questions)
        └── quizAttempts     (JSONB: per-student video quiz scores)
  └── live_sessions
        └── live_participants
  └── teachers
  └── students
  └── notifications
  └── messages
```

---

## Infrastructure

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| PostgreSQL | postgres:15 | 5432 | Primary relational DB (shared by SaaS + Institute) |
| MinIO | minio/minio | 9000 / 9001 | Object storage for uploads (bucket: `smartedx-bucket`) |
| Redis | redis:7 | 6379 | Session cache, real-time state |
| Qdrant | qdrant/qdrant | 6333 / 6334 | Vector DB for course knowledge base |

Start all with:
```bash
docker-compose up -d
```
