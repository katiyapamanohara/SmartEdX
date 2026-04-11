# SmartEdX — Service Reference

Each service is an independently deployable unit. This document describes what each service does, its key API surface, and its dependencies.

---

## API Gateway

**Path:** `/api-gateway`  
**Port:** 5001  
**Tech:** NestJS 11, TypeScript

The API Gateway is the only service exposed to clients. It routes all incoming requests to the correct backend service and proxies WebSocket connections to the Voice Agent.

### Routing

| Incoming path | Forwarded to |
|---------------|-------------|
| `/api/auth/**` | SaaS Service :5002 |
| `/api/institutes/**` | Institute Service :5003 |
| `/api/ai/**` | AI Core :8001 |
| `/api/voice-agent/**` | Voice Agent :8002 |
| WS `/voice-agent` | Voice Agent :8002 |

### Configuration

```env
PORT=5001
SAAS_SERVICE_URL=http://localhost:5002
INSTITUTE_SERVICE_URL=http://localhost:5003
AI_CORE_URL=http://localhost:8001
GATEWAY_SECRET=your-secret
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

---

## SaaS Service

**Path:** `/backend/saas_service`  
**Port:** 5002  
**Tech:** NestJS 11, TypeScript, TypeORM, PostgreSQL

Handles global system state — all tenants, users, and authentication live here.

### Responsibilities

- User registration (email/password and Firebase)
- JWT token issuance (`1d` expiry by default)
- Institute creation and configuration
- Global and institute-scoped role management
- Assigning users to institutes with a role

### Key Entities

| Entity | Table | Description |
|--------|-------|-------------|
| User | `users` | System-level user accounts |
| Institute | `institutes` | Tenant organizations |
| InstituteUser | `institute_users` | User ↔ institute assignment with role |
| InstituteRole | `institute_roles` | Per-institute role definitions |
| Role | `roles` | Global system roles |

### Configuration

```env
PORT=5002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=dev
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=1d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=smartedx-bucket
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
GATEWAY_SECRET=your-gateway-secret
```

---

## Institute Service

**Path:** `/backend/institute_service`  
**Port:** 5003  
**Tech:** NestJS 11, TypeScript, TypeORM, PostgreSQL, Socket.IO

The largest and most feature-rich service. All educational operations happen here.

### Responsibilities

- Course, module, and content management (CRUD)
- File upload to MinIO (PDF, DOCX, video) with Qdrant auto-indexing
- Student and teacher management
- Course enrollment management
- Exam lifecycle: creation, scheduling, access control, submission, grading
- Exam integrity monitoring with violation logging
- Video recording management with category and course assignment
- Timed video questions (questions injected at specific timestamps)
- Live session management via Socket.IO
- Real-time notifications
- Student performance reporting across quizzes and exams
- Voice session lifecycle management (direct endpoints for Voice Agent)

### Key Entities

| Entity | Table | Description |
|--------|-------|-------------|
| Course | `courses` | Educational courses |
| CourseModule | `course_modules` | Sections within a course |
| ModuleContent | `module_contents` | Lessons, videos, quizzes, PDFs |
| Student | `students` | Student profiles with face descriptors |
| Teacher | `teachers` | Teacher profiles |
| Exam | `exams` | Assessments with integrity tracking |
| Recording | `recordings` | Video lecture recordings |
| RecordingCategory | `recording_categories` | Groupings for recordings |
| LiveSession | `live_sessions` | Real-time class sessions |
| LiveParticipant | `live_participants` | Session attendees |
| Message | `messages` | Chat messages |
| Notification | `notifications` | System notifications |

### JSONB Fields (schema-flexible data)

| Entity | Field | Purpose |
|--------|-------|---------|
| `ModuleContent` | `quizData` | Quiz questions, settings, max attempts |
| `ModuleContent` | `studentAttempts` | Per-student scores and answer history |
| `Exam` | `questions` | Exam questions and marking |
| `Exam` | `studentAttempts` | Per-student exam scores and answers |
| `Exam` | `integrityFlags` | Per-student integrity violation events |
| `Recording` | `videoQuestions` | Timed mid-video questions |
| `Recording` | `quizAttempts` | Per-student video quiz scores |
| `Student` | `faceDescriptor` | 512-d face vector for proctoring |

### Voice Session Endpoints (bypass gateway)

These endpoints are called directly by the Voice Agent and are excluded from the global prefix:

```
POST /api/session/voice/start
POST /api/session/voice/end
```

### Configuration

```env
PORT=5003
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=dev
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=1d
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=smartedx-bucket
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
GATEWAY_SECRET=your-gateway-secret
```

---

## AI Core

**Path:** `/backend/ai_core`  
**Port:** 8001  
**Tech:** FastAPI, Python 3.11+, Agno agent framework

Provides all AI-powered content generation. Supports three LLM providers, switchable via environment variable.

### Supported Providers

| Provider | Models | env `AI_PROVIDER` |
|----------|--------|-------------------|
| Anthropic | claude-sonnet-4-6, claude-opus-4-6 | `anthropic` |
| OpenAI | gpt-4o, gpt-4o-mini | `openai` |
| Google | gemini-2.0-flash, gemini-1.5-pro | `gemini` |

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/quiz/generate-from-text` | Generate MCQ/essay questions from raw text |
| POST | `/api/ai/quiz/generate-from-file` | Generate questions from uploaded PDF/DOCX/PPTX |
| POST | `/api/ai/chat` | General-purpose AI chat |
| POST | `/api/ai/teacher-chat` | Teacher-mode chat assistance |
| POST | `/api/ai/student-chat` | Student learning chat |
| POST | `/api/ai/voice-assessment` | Score a voice answer against expected answer |
| POST | `/api/ai/transcription` | Speech-to-text transcription |
| POST | `/api/ai/description` | Generate content description |

### Quiz Generation Payload

```json
{
  "text": "Course content to generate questions from",
  "numQuestions": 10,
  "difficulty": "medium",
  "questionType": "mcq"
}
```

### Configuration

```env
PORT=8001
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AI...
MODEL_ID=claude-sonnet-4-6
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5001
```

---

## Voice Agent

**Path:** `/backend/voice_agent`  
**Port:** 8002  
**Tech:** FastAPI, Python 3.13+, Google ADK, Gemini Live API, Qdrant

Enables real-time voice learning. Students speak with a Gemini-powered AI tutor that has access to course materials.

### How It Works

1. Student connects via WebSocket or SIP
2. Voice Agent opens a Gemini Live session
3. Student questions are processed in real-time audio
4. Agent queries Qdrant for relevant course KB content
5. Gemini generates a spoken response grounded in course material
6. Session lifecycle (start/end) is synced to Institute Service

### Knowledge Base Indexing

When a teacher uploads a PDF or DOCX to a course, the Institute Service calls the AI Core to extract text, which is then embedded and stored in Qdrant under a collection per course (`course_kb`). The Voice Agent queries this collection during sessions.

### Transport Protocols

| Protocol | Endpoint | Use Case |
|----------|----------|---------|
| WebSocket | `ws://localhost:8002/ws` | Browser-based voice chat |
| SIP/UDP | Port 5060 | VoIP phone integration |

### Configuration

```env
GOOGLE_API_KEY=AI...
DEMO_AGENT_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
AI_CORE_URL=http://localhost:8001
INSTITUTE_SERVICE_URL=http://localhost:5003
MINIO_URL=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
COURSE_KB_ENABLED=true
COURSE_KB_COLLECTION_NAME=course_kb
SIP_SERVER_HOST=localhost
SIP_SDP_HOST=127.0.0.1
SIP_SDP_PORT=20000
```

---

## Facial Recognition Server

**Path:** `/backend/facial_recognition_server`  
**Port:** 8003  
**Tech:** FastAPI, Python, DeepFace

Provides face enrollment and verification for exam proctoring.

### How It Works

1. **Enrollment:** Student uploads a face photo via the portal. The descriptor (512-d vector) is extracted and stored on the `Student` entity in PostgreSQL.
2. **Verification:** At exam start, a webcam frame is captured. The Institute Service calls this server with the stored descriptor and live frame. Cosine distance below 0.30 = match.

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/face/enroll` | Extract and return face descriptor from image |
| POST | `/face/verify` | Compare two descriptors, return match result |

### Configuration

```env
PORT=8003
FACE_MODEL=Facenet512
DETECTOR_BACKEND=opencv
DISTANCE_THRESHOLD=0.30
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5001
```

---

## Institute Portal

**Path:** `/frontend/institute_protal`  
**Port:** 3001  
**Tech:** Next.js 16, React 19, TypeScript, TailwindCSS

The main application used by institute administrators, teachers, and students.

### Route Structure

```
/[instituteId]/
  (auth)/                 Login, register
  institute/              Admin dashboard, user management, settings
  teacher/
    courses/              Course management
    courses/[courseId]/   Module/content editor
    recordings/           Recording management + timed questions
    reports/              Student performance reports
    integrity-monitor/    Exam integrity violation review
    live/                 Live session management
  student/
    courses/              My enrolled courses
    recordings/           Course recordings (mid-video questions)
    assignments/[id]/     Quiz assessment taking
    exams/[id]/           Exam taking with proctoring
    dashboard/            Student overview
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `socket.io-client` | Real-time live sessions and notifications |
| `face-api.js` | Browser-side face detection for proctoring |
| `apexcharts` | Analytics charts |
| `fullcalendar` | Schedule/calendar views |
| `@dnd-kit` / `react-dnd` | Drag-and-drop content ordering |
| `react-dropzone` | File upload UI |
| `swiper` | Carousel/slider UI |

---

## SaaS Admin Portal

**Path:** `/frontend/sass_protal`  
**Port:** 3000  
**Tech:** Next.js 16, React 19, TypeScript, TailwindCSS, Framer Motion

The operator-facing dashboard for managing the SmartEdX SaaS platform.

### Route Structure

```
/                         Landing page
/(full-width-pages)/
  onboard/                Guided institute onboarding
  (auth)/                 Login, register
/admin/                   System admin panel
/dashboard/               Institute owner dashboard
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `framer-motion` | Animations and transitions |
| `canvas-confetti` | Onboarding celebration effects |
| `apexcharts` | Analytics dashboards |
| `next-themes` | Dark mode support |
