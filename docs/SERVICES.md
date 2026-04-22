# SmartEdX — Service Reference

Each service is an independently deployable unit. This document describes what each service does, its tech stack, key responsibilities, dependencies, and how to run it.

---

## 1. API Gateway

| Property | Value |
|---|---|
| Location | `api-gateway/` |
| Framework | NestJS 11 + TypeScript |
| Port | `5001` |
| Role | Single HTTP/WebSocket entry point for all client requests |

### Responsibilities
- Reverse-proxy all client HTTP requests to downstream services using `http-proxy-middleware`
- Proxy WebSocket connections (Voice Agent WS, Socket.IO)
- CORS management for frontend portals
- Route prefix mapping: `/api/auth` → SaaS Service, `/api/institutes` → Institute Service, `/api/ai` → AI Core, `/api/voice-agent` → Voice Agent

### Routing Rules
```
/api/auth/*          → http://saas-service:5002
/api/institutes/*    → http://institute-service:5003
/api/ai/*            → http://ai-core:8001
/api/voice-agent/*   → http://voice-agent:8002
WS /voice-agent/*    → ws://voice-agent:8002
```

### Dependencies
- SaaS Service (HTTP)
- Institute Service (HTTP + WebSocket)
- AI Core (HTTP)
- Voice Agent (HTTP + WebSocket)

### Environment Variables
```
PORT=5001
SAAS_SERVICE_URL=http://localhost:5002
INSTITUTE_SERVICE_URL=http://localhost:5003
AI_CORE_URL=http://localhost:8001
VOICE_AGENT_URL=http://localhost:8002
GATEWAY_SECRET=<shared-secret>
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

---

## 2. SaaS Service

| Property | Value |
|---|---|
| Location | `backend/saas_service/` |
| Framework | NestJS 11 + TypeScript |
| ORM | TypeORM |
| Port | `5002` |
| Database | PostgreSQL (`saas_service` DB) |
| Role | Global platform management — tenants, users, billing |

### Responsibilities
- SaaS user registration and login (email/password + Firebase)
- Institute CRUD — create, update, delete, manage plan/features
- Institute user management (assign users to institutes, roles)
- Subscription management — plan, billing cycle, payment status
- PayHere payment gateway integration
- Admin analytics (platform-wide stats)
- JWT token issuance (shared secret with Institute Service)
- Auto-seed admin users and roles on startup

### Key Modules
| Module | Purpose |
|---|---|
| `auth` | Users, institutes, roles, JWT, Firebase verification |
| `subscription` | Subscription CRUD and status management |
| `payhere` | PayHere hash generation, checkout, webhook handler |

### Dependencies
- PostgreSQL
- Redis
- MinIO (logo uploads)
- Firebase Admin SDK
- JWT (shared with Institute Service)

### Environment Variables
```
PORT=5002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<password>
DB_DATABASE=saas_service
JWT_SECRET=<shared-secret>
JWT_EXPIRATION=1d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
MINIO_BUCKET=smartedx-bucket
REDIS_HOST=localhost
REDIS_PORT=6379
GATEWAY_SECRET=<shared-secret>
FIREBASE_PROJECT_ID=<project>
FIREBASE_PRIVATE_KEY=<key>
FIREBASE_CLIENT_EMAIL=<email>
PAYHERE_MERCHANT_ID=<id>
PAYHERE_SECRET=<secret>
```

---

## 3. Institute Service

| Property | Value |
|---|---|
| Location | `backend/institute_service/` |
| Framework | NestJS 11 + TypeScript |
| ORM | TypeORM |
| Port | `5003` |
| Database | PostgreSQL (`institute_service` DB) |
| Role | All LMS domain features — courses, exams, recordings, live classes, messaging |

### Responsibilities
- Institute user management and authentication
- Face identity enrollment and verification (calls Face Rec Server)
- Full course hierarchy management (courses → modules → contents)
- Course knowledge base indexing (calls Voice Agent to index into Qdrant)
- Exam management with configurable proctoring
- Exam integrity flagging and review
- Live face check during exams (calls Face Rec Server)
- Screen analysis during exams (calls AI Core)
- Video recording management and video quiz
- Live class session management
- Direct messaging between users
- Push notifications
- Redis response caching (with `@SkipCache()` decorator for real-time routes)
- Socket.IO gateways: `/live`, `/messages`, `/notifications`

### Key Modules
| Module | Purpose |
|---|---|
| `auth` | Institute users, roles, face ID (enroll/verify) |
| `courses` | Course, module, content CRUD + KB search |
| `exams` | Exam CRUD, submission, integrity flagging, essay grading |
| `recordings` | Recording upload, categories, course assignments, video quiz |
| `live` | Live session lifecycle + participant tracking |
| `messages` | Direct message threads |
| `notifications` | Notification creation and delivery |
| `gateway` | Socket.IO gateways (live, messages, notifications) |

### Dependencies
- PostgreSQL
- Redis
- MinIO
- AI Core (quiz generation, screen analysis, essay grading, teacher tools)
- Face Recognition Server (face enroll/verify)
- Voice Agent (KB indexing, voice session control)
- Firebase Admin SDK
- JWT (shared with SaaS Service)

### Environment Variables
```
PORT=5003
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<password>
DB_DATABASE=institute_service
JWT_SECRET=<shared-secret>         # Must match SaaS Service
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
MINIO_BUCKET=smartedx-bucket
REDIS_HOST=localhost
REDIS_PORT=6379
AI_CORE_URL=http://localhost:8001
FACE_REC_URL=http://localhost:8003
VOICE_AGENT_URL=http://localhost:8002
GATEWAY_SECRET=<shared-secret>
FIREBASE_PROJECT_ID=<project>
FIREBASE_PRIVATE_KEY=<key>
FIREBASE_CLIENT_EMAIL=<email>
```

---

## 4. AI Core

| Property | Value |
|---|---|
| Location | `backend/ai_core/` |
| Framework | Python 3.11 + FastAPI + Agno |
| Port | `8001` |
| Role | All AI/ML features — quiz generation, chat, transcription, screen analysis, teacher tools |

### Responsibilities
- Quiz generation from text or uploaded documents (PDF/DOCX/PPTX)
- AI chat agents for institute admins, teachers, and students
- Audio transcription (Gemini multi-language)
- Screen analysis for academic dishonesty detection (vision models)
- Essay grading with AI feedback
- Lesson plan generation
- Class insights and at-risk student analysis
- Voice assessment question generation and answer evaluation

### AI Provider Support
Configurable via `AI_PROVIDER` environment variable:
- `anthropic` — Anthropic Claude (default: `claude-sonnet-4-6`)
- `openai` — OpenAI GPT (e.g., `gpt-4o`)
- `gemini` — Google Gemini (e.g., `gemini-2.0-flash`)

### Key Routers
| Router | File | Endpoints |
|---|---|---|
| Quiz | `routers/quiz.py` | `/api/quiz/generate-from-text`, `/api/quiz/generate-from-file` |
| Chat | `routers/chat.py` | `/api/chat/message`, `/api/teacher-chat/message`, `/api/student-chat/message` |
| Screen | `routers/screen.py` | `/api/screen/analyze` |
| Teacher Tools | `routers/teacher_tools.py` | `/api/teacher-tools/*` |
| Transcription | `routers/transcription.py` | `/api/transcription/transcribe` |
| Voice Assessment | `routers/voice_assessment.py` | `/api/voice-assessment/*` |
| Description | `routers/description.py` | `/api/description/generate` |

### Dependencies
- Anthropic API / OpenAI API / Google Gemini API (at least one required)

### Environment Variables
```
PORT=8001
AI_PROVIDER=anthropic          # anthropic | openai | gemini
MODEL_ID=claude-sonnet-4-6
ANTHROPIC_API_KEY=<key>
OPENAI_API_KEY=<key>
GOOGLE_API_KEY=<key>
```

---

## 5. Voice Agent

| Property | Value |
|---|---|
| Location | `backend/voice_agent/` |
| Framework | Python 3.11 + FastAPI + Google ADK |
| Port | `8002` |
| Role | Real-time voice AI assistant powered by Gemini Live |

### Responsibilities
- Host three Gemini Live voice agent modes: general, teacher, course Q&A
- Manage voice sessions (`InMemorySessionService`)
- Index course documents into Qdrant for RAG (retrieval-augmented generation)
- Search institute knowledge base at query time
- Support SIP/UDP transport for VoIP/telephony integration
- Store conversation transcripts per session
- Warm up FastEmbed embedding model on startup (background thread)

### Agent Modes
| Mode | WS Path | Description |
|---|---|---|
| General | `/ws/{institute_id}/{user_id}/{session_id}` | General institute assistant |
| Teacher | `/ws/teacher/{institute_id}/{teacher_id}/{session_id}` | Teacher assistant with KB access |
| Course Q&A | `/ws/course-qa/{institute_id}/{course_id}/{user_id}/{session_id}` | Course-scoped Q&A |

### Voice Model
`gemini-2.5-flash-native-audio-preview-12-2025` (or configurable via `DEMO_AGENT_MODEL`)

### Embedding Model
`all-MiniLM-L6-v2-onnx` via FastEmbed (warmed up on startup)

### Dependencies
- Google Gemini API (Gemini Live)
- Qdrant (vector DB for course KB)
- Institute Service (for institute/course context)
- AI Core (optional, for hybrid tasks)
- MinIO (document access)

### Environment Variables
```
GOOGLE_API_KEY=<key>
DEMO_AGENT_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
QDRANT_URL=http://localhost:6333
MINIO_URL=http://localhost:9000
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
INSTITUTE_SERVICE_URL=http://localhost:5003
AI_CORE_URL=http://localhost:8001
SIP_HOST=0.0.0.0
SIP_PORT=5060
LANGFUSE_PUBLIC_KEY=<key>       # Optional: observability
LANGFUSE_SECRET_KEY=<key>
LANGFUSE_HOST=<host>
```

---

## 6. Facial Recognition Server

| Property | Value |
|---|---|
| Location | `backend/facial_recognition_server/` |
| Framework | Python 3.11 + FastAPI + DeepFace |
| Port | `8003` |
| Role | Face enrollment and verification for exam proctoring |

### Responsibilities
- Extract 512-dimensional face descriptors from uploaded images (Facenet512 model)
- Verify identity by computing cosine distance between two descriptors
- Verify a stored descriptor against a live webcam capture (base64)
- Return verification result with distance score and pass/fail decision

### Model Details
| Property | Value |
|---|---|
| Model | DeepFace Facenet512 |
| Embedding dimensions | 512 |
| Distance metric | Cosine |
| Verification threshold | ≤ 0.30 (configurable) |
| Detector backend | OpenCV |

### Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/api/face/enroll` | Extract descriptor from image upload |
| POST | `/api/face/verify` | Compare two descriptors |
| POST | `/api/face/verify-image` | Verify descriptor vs. base64 image |
| GET | `/health` | Health check |

### Environment Variables
```
PORT=8003
FACE_MODEL=Facenet512
DETECTOR_BACKEND=opencv
DISTANCE_THRESHOLD=0.30
```

---

## 7. Institute Portal (Frontend)

| Property | Value |
|---|---|
| Location | `frontend/institute_protal/` |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Port | `3001` |
| Role | Web app for institute admins, teachers, and students |

### Key Dependencies
- TailwindCSS 4 + Tailwind Merge
- ApexCharts + react-apexcharts (data visualization)
- FullCalendar 6 (scheduling)
- Firebase JS SDK 12 (auth)
- Socket.IO client (real-time)
- `@vladmandic/face-api` (client-side face detection)
- react-dropzone (file uploads)
- react-dnd (drag and drop)
- flatpickr (date picker)

### Route Structure (`/[instituteId]/`)
```
/(auth)/signin                    Login
/institute/courses                Institute admin course management
/institute/users/lecture-staff    Teacher/staff management
/institute/users/students         Student management
/institute/finance                Finance / billing
/teacher/courses                  Teacher course management
/teacher/assessments              Quiz assessments
/teacher/exams                    Exam management
/teacher/recordings               Video recording management
/teacher/live-classes             Live session management
/teacher/integrity-monitor        Exam integrity dashboard
/teacher/messages                 Direct messaging
/teacher/performance              Analytics
/teacher/reports                  Student reports
/teacher/ai-tools                 AI tools
/teacher/virtual-labs             Virtual labs
/student/my-courses               Enrolled courses
/student/exams                    Available exams
/student/assignments              Quiz assignments
/student/recordings               Video recordings
/student/live-classes             Live classes
/student/ai-chat                  AI chat assistant
/student/performance              Performance dashboard
/student/messages                 Direct messaging
/student/virtual-labs             Virtual labs
```

### Environment Variables
```
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_FIREBASE_API_KEY=<key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
```

---

## 8. SaaS Portal (Frontend)

| Property | Value |
|---|---|
| Location | `frontend/sass_protal/` |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Port | `3000` |
| Role | Web app for SaaS operators and platform admins |

### Key Dependencies
- TailwindCSS 4
- framer-motion (animations)
- ApexCharts (charts)
- Firebase JS SDK

### Route Structure
```
/(full-width-pages)/(auth)/signin       Operator login
/(full-width-pages)/(auth)/admin-login  Admin login
/(full-width-pages)/onboard             New institute onboarding wizard
/dashboard                              Operator home dashboard
/dashboard/(others-pages)/institute/:id Institute detail
/dashboard/(others-pages)/billing       Billing management
/dashboard/(others-pages)/profile       Profile settings
/admin/institutes                       Admin: all institutes
/admin/subscriptions                    Admin: subscription management
/admin/users                            Admin: user management
```

### Environment Variables
```
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_FIREBASE_API_KEY=<key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
```

---

## 9. Infrastructure Services (Docker Compose)

### PostgreSQL 15
- **Port:** 5432
- **Role:** Primary relational database
- **Databases:** `saas_service`, `institute_service`
- **Used by:** SaaS Service, Institute Service

### Redis (Alpine)
- **Port:** 6379
- **Role:** Response cache (HTTP GET caching via `RedisCacheInterceptor`)
- **Config:** `maxmemory 100mb`, `maxmemory-policy allkeys-lru`
- **Used by:** Institute Service, SaaS Service

### MinIO
- **API Port:** 9000
- **Console Port:** 9001
- **Role:** S3-compatible object storage for all user-uploaded files
- **Bucket:** `smartedx-bucket` (public access)
- **Used by:** Institute Service, SaaS Service, Voice Agent, AI Core

### Qdrant
- **HTTP Port:** 6333
- **gRPC Port:** 6334
- **Role:** Vector database for course knowledge base semantic search
- **Collection:** `course_kb`
- **Used by:** Voice Agent (indexing + search), Institute Service (KB search via Voice Agent)
- **Persistence:** Docker volume `qdrant_storage`

---

## Service Dependency Graph

```
                Frontend Portals (3000, 3001)
                         │
                  API Gateway (5001)
                 /    |    \        \
                /     |     \        \
         SaaS(5002) Inst(5003) AI(8001) Voice(8002)
            │          │   \    /         │
            │          │    Face(8003)     │
            │          │                  │
         PostgreSQL  PostgreSQL         Qdrant
           Redis       Redis            MinIO
           MinIO       MinIO
```
