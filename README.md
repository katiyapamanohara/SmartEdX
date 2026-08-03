# SmartEdX

An AI-powered educational platform built as a scalable multi-tenant SaaS system. SmartEdX enables institutes to manage courses, deliver live and recorded learning, run AI-generated assessments, and proctor exams using facial recognition — all from a single deployment.



---


## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Services & Ports](#services--ports)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)

---

## Features

### Course Management
- Create courses with structured modules and content items
- Upload PDF, DOCX, and video files as course materials
- Auto-index uploaded documents into a searchable knowledge base
- Teacher-assigned courses with full content lifecycle (create, edit, delete)

### AI-Powered Assessments
- Generate quiz questions from any text or document using Claude, GPT, or Gemini
- Multiple question types: MCQ and essay
- Configurable difficulty (easy / medium / hard) and question count
- Timed video questions — questions appear mid-video at specific timestamps
- Voice-based oral assessments via Gemini Live

### Exam Proctoring & Integrity
- Face ID verification before exams begin (DeepFace + Facenet512)
- Real-time integrity monitoring during exams:
  - Tab/window switching detection
  - Face loss and multiple-face detection
  - Fullscreen exit tracking
  - Camera disable detection
- Per-student violation log with severity levels
- Teacher integrity monitor dashboard with review workflow

### Live & Recorded Learning
- Live class sessions with real-time participation via Socket.IO
- Video recording management with category organization
- Recordings assigned to courses with student access control (deadline enforcement)
- Student recording page with mid-video question overlays

### Voice Agent
- Real-time conversational AI powered by Google Gemini Live
- Asks and evaluates voice answers against course knowledge base
- Retrieves context from indexed course documents via Qdrant vector search
- Supports WebSocket (browser) and SIP (VoIP) transports

### Reporting
- Teacher student-report: per-student quiz and exam scores across all courses
- Sortable, filterable student table with grade badges
- Individual student detail modal with full quiz and exam breakdowns
- CSV export (per-student and bulk) and PDF print

### Multi-Tenant SaaS
- Multiple institutes per deployment, each fully isolated
- Role-based access: Super Admin, Institute Admin, Teacher, Student
- Firebase + JWT authentication
- Guided onboarding for new institutes

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         Client Browsers                            │
│          Institute Portal (3001)    SaaS Portal (3000)             │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ HTTP / WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       API Gateway  :5001                          │
│   Routes: /auth → SaaS  |  /institutes → Institute               │
│           /ai → AI Core  |  /voice-agent → Voice Agent WS        │
└────┬──────────┬──────────┬───────────────┬──────────────────────┘
     │          │          │               │
     ▼          ▼          ▼               ▼
 SaaS Svc  Institute   AI Core       Voice Agent
  :5002      :5003       :8001          :8002
     │          │          │               │
     │          │          ▼               ▼
     │          │      Claude/GPT/      Gemini Live
     │          │       Gemini           + Qdrant
     │          │
     ▼          ▼
  PostgreSQL  PostgreSQL
   (shared)   (shared)
     │          │
     └────┬─────┘
          ▼
   ┌─────────────────────┐
   │  Infrastructure     │
   │  MinIO      :9000   │
   │  Redis      :6379   │
   │  Qdrant     :6333   │
   │  Face Rec   :8003   │
   └─────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full service breakdown.

---

## Services & Ports

| Service                  | Tech          | Port | Description                              |
|--------------------------|---------------|------|------------------------------------------|
| API Gateway              | NestJS        | 5001 | Central request router                   |
| SaaS Service             | NestJS        | 5002 | Auth, tenants, user management           |
| Institute Service        | NestJS        | 5003 | Courses, exams, recordings, live sessions|
| AI Core                  | FastAPI/Agno  | 8001 | AI quiz generation, chat assistants      |
| Voice Agent              | FastAPI/Google ADK | 8002 | Real-time voice learning          |
| Facial Recognition       | FastAPI/DeepFace | 8003 | Face enrollment & exam verification  |
| Institute Portal         | Next.js       | 3001 | Teacher, student, admin dashboards       |
| SaaS Admin Portal        | Next.js       | 3000 | Multi-tenant operator dashboard          |
| MinIO                    | Object Store  | 9000 | File & document storage (S3-compatible)  |
| Redis                    | Cache         | 6379 | Session cache, real-time state           |
| Qdrant                   | Vector DB     | 6333 | Course knowledge base semantic search    |
| PostgreSQL               | RDBMS         | 5432 | Primary relational database              |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+

### 1. Start infrastructure

```bash
docker-compose up -d
```

This starts MinIO, Redis, and Qdrant.

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure environment

Copy and fill in `.env.example` files in each service directory. See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for all variables.

### 4. Start all services

```bash
# All services at once
npm start

# Backend only
npm run start:backend

# Frontend only
npm run start:frontend
```

### Individual services

```bash
npm run dev:api          # API Gateway       :5001
npm run dev:saas         # SaaS Service      :5002
npm run dev:institute    # Institute Service :5003
npm run dev:ai_core      # AI Core           :8001
npm run dev:voice_agent  # Voice Agent       :8002
npm run dev:face_rec     # Face Recognition  :8003
npm run dev:inst_portal  # Institute Portal  :3001
npm run dev:sass_portal  # SaaS Portal       :3000
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) | Step-by-step local setup guide |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Full service architecture and data flow |
| [docs/SERVICES.md](docs/SERVICES.md) | Per-service breakdown with endpoints |
| [docs/PORTS.md](docs/PORTS.md) | All ports and network topology |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Environment variable reference |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature deep-dives |
| [backend/ai_core/README.md](backend/ai_core/README.md) | AI Core setup guide |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS |
| Backend API | NestJS 11, TypeScript, Express |
| AI Services | FastAPI, Python, Agno framework |
| Voice AI | Google Gemini Live, Google ADK |
| Face AI | DeepFace, Facenet512 |
| Database | PostgreSQL 15, TypeORM |
| Vector DB | Qdrant |
| Cache | Redis |
| Object Storage | MinIO (S3-compatible) |
| Auth | Firebase + JWT |
| Real-time | Socket.IO |
| LLM Providers | Anthropic Claude, OpenAI GPT, Google Gemini |
