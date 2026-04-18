# SmartEdX — Feature Reference

Detailed breakdown of every major feature in the platform, where it lives in the codebase, and how it works end-to-end.

---

## 1. Multi-Tenant SaaS Architecture

**What it does:** Multiple independent institutes share one platform. Each institute is fully isolated by `instituteId`. The SaaS operator manages institutes, plans, and billing from the SaaS portal.

**Roles:**
- **Super Admin** — SaaS platform operator, manages all institutes and subscriptions
- **Institute Admin** — manages users, courses, exams, and settings for their institute
- **Teacher** — creates/manages courses, exams, recordings, and live sessions
- **Student** — enrolls in courses, takes exams, watches recordings, joins live classes

**Institute Plans:** `starter`, `pro`, `enterprise`

Each plan controls which features are enabled via the `enabledFeatures` JSONB array:
- `virtual_labs` — access to virtual lab tools
- `ai_tools` — quiz generation, teacher AI tools, AI chat
- `voice_agent` — Gemini Live voice assistant

**Key Files:**
- `backend/saas_service/src/modules/auth/` — institutes, users, roles
- `frontend/sass_protal/` — SaaS operator/admin dashboard
- `backend/institute_service/src/modules/auth/entities/institute.entity.ts`

---

## 2. Authentication & Identity

**What it does:** Dual authentication — Firebase handles Google identity; JWT carries role and institute context for all subsequent requests.

**Flow:**
1. User authenticates with Firebase (Google OAuth or email/password via Firebase Auth)
2. Frontend sends Firebase ID token to `/auth/firebase/login`
3. Backend verifies token via Firebase Admin SDK, looks up user in PostgreSQL, signs a JWT
4. All subsequent requests include `Authorization: Bearer <jwt>` header

**Face Identity:**
- Students enroll a face descriptor by uploading a photo → stored as 512-d JSONB array
- Before entering a proctored exam, webcam frame is verified against stored descriptor via DeepFace Facenet512 (cosine distance ≤ 0.30)

**Key Files:**
- `backend/saas_service/src/modules/auth/auth.service.ts`
- `backend/institute_service/src/modules/auth/auth.service.ts`
- `backend/facial_recognition_server/routers/face.py`

---

## 3. Course Management

**What it does:** Full LMS course hierarchy. Teachers create and manage courses; students enroll and access content.

**Structure:**
```
Institute
  └── Course (has teachers M2M, students M2M)
        └── CourseModule (ordered)
              └── ModuleContent (ordered)
                    types: pdf | video | document | quiz | link | simulation
```

**Content Types:**
- **PDF / Document / Video / Link** — reference materials stored in MinIO or external URL
- **Simulation** — interactive virtual lab content
- **Quiz** — embedded assessment within a module (MCQ/essay, AI-generatable)

**Course Knowledge Base:** Every file uploaded to a module content is auto-indexed into Qdrant (vector DB). Students and the voice agent can then run semantic search against course content.

**Key Files:**
- `backend/institute_service/src/modules/courses/` — course, module, content services
- `frontend/institute_protal/src/app/[instituteId]/teacher/courses/` — teacher course management
- `frontend/institute_protal/src/app/[instituteId]/student/my-courses/` — student course view

---

## 4. AI-Powered Quiz Generation

**What it does:** Teachers generate quiz questions from uploaded documents or plain text. Supports MCQ, essay, and mixed formats with configurable difficulty.

**Flow:**
1. Teacher uploads PDF/DOCX/PPTX or pastes text
2. AI Core extracts content → sends to LLM (Claude/GPT/Gemini)
3. Returns structured `ExamQuestion[]` — teacher reviews and saves

**Providers:** Configurable via `AI_PROVIDER` env var — `anthropic`, `openai`, or `gemini`

**Key Files:**
- `backend/ai_core/routers/quiz.py`
- `frontend/institute_protal/src/app/[instituteId]/teacher/assessments/`

---

## 5. Exam System & Proctoring

**What it does:** Full-featured proctored exam engine. Each exam has configurable integrity controls. Results tracked per student with JSONB storage.

### Exam Configuration
| Setting | Description |
|---|---|
| `requireFaceId` | Student must verify identity before entering |
| `requireScreenShare` | Student must share screen during exam |
| `enableLiveFaceCheck` | Periodic webcam verification during exam (~60s) |
| `autoFailOnCheat` | Auto-fail when 3+ high-severity violations detected |
| `durationMinutes` | Exam time limit |
| `passingScore` | Pass threshold (percentage) |
| `maxAttempts` | How many attempts allowed |

### Integrity Violation Types
| Type | Severity | Trigger |
|---|---|---|
| `tab_switch` | medium | Student switches browser tab |
| `fullscreen_exit` | medium | Student exits fullscreen mode |
| `copy_attempt` | low | Student tries to copy text |
| `face_absent` | high | No face detected in webcam |
| `multiple_faces` | high | Multiple faces detected |
| `face_verify_failed` | high | Face doesn't match enrolled descriptor |
| `live_face_mismatch` | high | Live check face mismatch |
| `camera_disabled` | high | Camera turned off |
| `screen_share_disabled` | high | Screen share stopped |
| `suspicious_screen` | high | AI detected cheating on screen |

### Essay Grading
- AI-assisted grading via `/api/teacher-tools/grade-essay`
- Teacher reviews AI-suggested grade and saves final score

**Key Files:**
- `backend/institute_service/src/modules/exams/` — exam service + entity
- `frontend/institute_protal/src/app/[instituteId]/student/exams/` — student exam UI
- `frontend/institute_protal/src/app/[instituteId]/teacher/integrity-monitor/` — teacher dashboard
- `backend/ai_core/routers/screen.py` — screen analysis

---

## 6. Video Recordings & Video Quiz

**What it does:** Teachers upload video recordings; students watch them. Teachers can embed timed quiz questions that appear as overlays at specific timestamps during playback.

### Recording Management
- Upload videos to MinIO (multipart upload)
- Organize into categories
- Assign to courses with a deadline date
- Students only see recordings from courses they're enrolled in with active deadlines

### Video Quiz
- Teacher adds `VideoQuestion` objects at specific `atSeconds` timestamps
- During playback, question overlay appears — student must answer before video continues
- Answers tracked per student with score and timestamp

**Key Files:**
- `backend/institute_service/src/modules/recordings/` — recording service
- `backend/institute_service/src/modules/recordings/recordings.entity.ts`
- `frontend/institute_protal/src/app/[instituteId]/student/recordings/` — student view
- `frontend/institute_protal/src/app/[instituteId]/teacher/recordings/` — teacher management

---

## 7. Live Classes

**What it does:** Real-time live class sessions. Teachers create, start, and end sessions; students join and participate. Uses Socket.IO for real-time signaling.

**Session Lifecycle:** `scheduled` → `live` → `ended`

**Real-time Events (Socket.IO `/live` namespace):**
- `join_session` / `leave_session` — room management
- `signal` — WebRTC peer signal relay (for audio/video streaming)
- `session_started` / `session_ended` / `participant_update` — broadcast events

**Key Files:**
- `backend/institute_service/src/modules/live/` — live session service
- `backend/institute_service/src/modules/gateway/live.gateway.ts` — Socket.IO gateway
- `frontend/institute_protal/src/app/[instituteId]/teacher/live-classes/`
- `frontend/institute_protal/src/app/[instituteId]/student/live-classes/`
- `frontend/institute_protal/src/components/videos/LivePipWidget.tsx` — PiP widget

---

## 8. Direct Messaging

**What it does:** Real-time direct messaging between teachers and students within an institute.

**Features:**
- Conversation threads (one-to-one)
- Unread count tracking per contact
- Real-time delivery via Socket.IO `/messages` namespace
- Multi-tab sync (sender gets `message_sent` event)

**Key Files:**
- `backend/institute_service/src/modules/messages/` — message service + entity
- `backend/institute_service/src/modules/gateway/message.gateway.ts`
- `frontend/institute_protal/src/app/[instituteId]/teacher/messages/`
- `frontend/institute_protal/src/app/[instituteId]/student/messages/`

---

## 9. Notifications

**What it does:** In-app push notifications for messages, exam alerts, cheat alerts, and reminders. Delivered via Socket.IO.

**Notification Types:**
- `message` — new direct message received
- `email` — email-related notifications
- `reminder` — user-created reminders
- `cheat_alert` — exam integrity violation alert (for teachers)

**Key Files:**
- `backend/institute_service/src/modules/notifications/` — notification service + entity
- `backend/institute_service/src/modules/gateway/notification.gateway.ts`
- `frontend/institute_protal/src/context/` — notification context

---

## 10. Voice Agent (AI Tutor)

**What it does:** Real-time voice AI assistant powered by Google Gemini Live. Students and teachers have spoken conversations with an AI tutor that knows the course content.

**Three Agent Modes:**
1. **General Institute Assistant** — answers general institute-level questions
2. **Teacher Assistant** — teacher-scoped AI with course knowledge base access
3. **Course Q&A** — student asks questions about a specific course; agent retrieves relevant content from Qdrant vector DB (RAG)

**Transport Options:**
- Browser WebSocket — `ws://.../ws/{institute_id}/{user_id}/{session_id}`
- SIP/UDP — VoIP phone integration for telephony access

**Knowledge Base RAG:**
- Course documents indexed with FastEmbed (all-MiniLM-L6-v2-onnx)
- Qdrant stores vectors in `course_kb` collection
- At query time: embed query → ANN search → inject top-k chunks into agent context

**Custom per-institute config:**
- `voiceInstructions` — custom system prompt for the voice agent
- `voiceGreeting` — custom greeting message

**Key Files:**
- `backend/voice_agent/app/` — full voice agent
- `backend/voice_agent/app/agents/` — agent configurations
- `frontend/institute_protal/src/components/student/CourseVoiceAssistant.tsx`
- `frontend/institute_protal/src/components/teacher/TeacherVoiceAgent.tsx`

---

## 11. AI Chat Assistants

**What it does:** Text-based AI chat for students, teachers, and institute admins. Each has a different context and available tools.

**Chat Modes:**
- **Student Chat** — general learning assistant; supports file attachment for homework help
- **Teacher Chat** — teaching assistant; can help with lesson planning, grading, content creation
- **Institute Chat** — admin assistant; supports tool calls to create courses, fetch analytics, etc.

**Key Files:**
- `backend/ai_core/routers/chat.py`
- `frontend/institute_protal/src/components/student/StudentFloatingAiChat.tsx`
- `frontend/institute_protal/src/components/teacher/TeacherFloatingAiChat.tsx`
- `frontend/institute_protal/src/components/live/FloatingAiChat.tsx`

---

## 12. Teacher AI Tools

**What it does:** A suite of AI-powered productivity tools for teachers.

| Tool | Description | Endpoint |
|---|---|---|
| Lesson Plan Generator | Generate structured lesson plans by topic, subject, grade, duration | `POST /api/teacher-tools/lesson-plan` |
| Essay Grader | AI grades student essays with feedback and suggested score | `POST /api/teacher-tools/grade-essay` |
| Class Insights | Analyze class performance data and generate narrative insights | `POST /api/teacher-tools/class-insights` |
| At-Risk Analysis | Identify struggling students based on performance data | `POST /api/teacher-tools/at-risk-analysis` |
| Quiz Generator | Generate quizzes from documents or text | `POST /api/quiz/generate-from-file` |
| Transcription | Transcribe audio/video content to text | `POST /api/transcription/transcribe` |

**Key Files:**
- `backend/ai_core/routers/teacher_tools.py`
- `frontend/institute_protal/src/app/[instituteId]/teacher/ai-tools/`

---

## 13. Voice Assessments

**What it does:** Oral/voice-based assessments. Teacher generates spoken questions; student records spoken answers; AI evaluates responses.

**Flow:**
1. Teacher generates voice assessment questions from document/text
2. Student receives questions as audio
3. Student speaks answers (audio recorded in browser)
4. Audio transcribed by Gemini transcription service
5. AI evaluates transcribed answers against sample answers

**Key Files:**
- `backend/ai_core/routers/voice_assessment.py`
- `frontend/institute_protal/src/components/student/VoiceAssessmentPlayer.tsx`
- `frontend/institute_protal/src/components/teacher/VoiceAssessmentModal.tsx`

---

## 14. Student Reports & Analytics

**What it does:** Performance tracking and reporting for teachers and students.

**Teacher Reports:**
- Per-student quiz and exam scores across all teacher courses
- CSV export and PDF print
- Individual student detail modal

**Student Performance:**
- Progress across enrolled courses
- Quiz attempt history
- Exam result history

**Platform Analytics (Admin):**
- Total institutes, users, subscriptions
- Revenue metrics
- Growth trends via ApexCharts

**Key Files:**
- `backend/institute_service/src/modules/courses/courses.service.ts` — `getStudentReport()`
- `frontend/institute_protal/src/app/[instituteId]/teacher/reports/`
- `frontend/institute_protal/src/app/[instituteId]/student/performance/`
- `frontend/sass_protal/src/app/admin/` — platform analytics

---

## 15. Payments & Subscriptions

**What it does:** PayHere payment gateway integration for subscription billing. SaaS admin manages institute subscriptions.

**Subscription Fields:** `plan`, `status`, `price`, `billingCycle`, `paymentMethod`, `startDate`, `endDate`, `nextBillingDate`, `payhereOrderId`, `payherePaymentId`

**Subscription Plans:** `starter`, `pro`, `enterprise`

**Billing Cycles:** `monthly`, `yearly`

**Payment Statuses:** `active`, `inactive`, `cancelled`, `trial`

**Key Files:**
- `backend/saas_service/src/modules/payhere/` — PayHere integration
- `backend/saas_service/src/modules/subscription/` — subscription management
- `frontend/sass_protal/src/app/dashboard/(others-pages)/billing/`

---

## 16. Object Storage (MinIO)

**What it does:** All user-uploaded files are stored in MinIO, an S3-compatible object store.

**Bucket:** `smartedx-bucket` (configured as public access)

**Stored content:**
- User and institute profile pictures / logos
- Course cover images
- Module content files (PDFs, videos, documents)
- Video recordings
- Any uploaded documents for AI processing

**Key config:** `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`

---

## 17. Redis Cache

**What it does:** Response caching for GET endpoints to reduce database load.

**Implementation:** Custom `RedisCacheInterceptor` in Institute Service applied globally. Routes decorated with `@SkipCache()` bypass the cache (e.g., real-time data like institute user lists).

**Config:** max memory 100MB, `allkeys-lru` eviction policy

---

## 18. Virtual Labs

**What it does:** Interactive virtual lab environment for hands-on learning simulations. Available as a plan feature (`virtual_labs`).

**Key Files:**
- `frontend/institute_protal/src/app/[instituteId]/student/virtual-labs/`
- `frontend/institute_protal/src/app/[instituteId]/teacher/virtual-labs/`
