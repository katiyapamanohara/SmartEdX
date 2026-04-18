# SmartEdX — API Reference

All client requests go through the **API Gateway** on port `5001`. The gateway reverse-proxies to backend services. WebSocket connections for live classes, messages, and notifications connect directly to the Institute Service on port `5003` (or proxied via the gateway).

**Base URL (local):** `http://localhost:5001`

**Auth header:** `Authorization: Bearer <jwt_token>`

---

## SaaS Service — `/api/auth`

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new SaaS user (email/password) |
| POST | `/api/auth/login` | Public | Login with email/password |
| POST | `/api/auth/firebase/register` | Public | Register via Firebase token |
| POST | `/api/auth/firebase/login` | Public | Login via Firebase token |
| GET | `/api/auth/me` | JWT | Get current user profile |
| GET | `/api/auth/validate` | JWT | Validate JWT token |
| POST | `/api/auth/complete-onboarding` | JWT | Complete new-user onboarding wizard |

### Admin User Management

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/admin/create` | Admin | Create admin user |
| GET | `/api/auth/admin/list` | Admin | List all admin users |
| GET | `/api/auth/users` | JWT | List all users (excluding system admin) |
| PATCH | `/api/auth/admin/toggle-status/:userId` | Admin | Toggle user active status |
| POST | `/api/auth/admin/reset-password` | Admin | Reset user password |
| POST | `/api/auth/seed/run` | Admin | Manually run database seed |

### Institutes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/institutes` | JWT | Get current user's institutes |
| GET | `/api/auth/institutes/:id` | JWT | Get institute by ID |
| POST | `/api/auth/institutes` | JWT | Create new institute |
| PATCH | `/api/auth/institutes/:id` | JWT | Update institute details |
| PATCH | `/api/auth/institutes/:id/features` | JWT | Update institute plan/features |
| DELETE | `/api/auth/institutes/:id` | JWT | Delete institute |
| POST | `/api/auth/institutes/:id/logo` | JWT | Upload institute logo (multipart/form-data) |
| GET | `/api/auth/roles` | JWT | Get all roles |
| POST | `/api/auth/institutes/:id/assign-user` | JWT | Assign user to institute |
| GET | `/api/auth/institutes/:id/users` | JWT | Get institute users |
| DELETE | `/api/auth/institutes/:id/users/:userId` | JWT | Remove user from institute |
| PATCH | `/api/auth/institutes/:id/users/:userId/toggle-status` | JWT | Toggle institute user status |

### Admin Analytics & Subscriptions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/admin/analytics` | Admin | Platform-wide analytics |
| GET | `/api/auth/admin/subscriptions` | Admin | List all subscriptions |
| POST | `/api/auth/admin/subscriptions` | Admin | Create/update subscription |
| PATCH | `/api/auth/admin/subscriptions/:id` | Admin | Update subscription |
| PATCH | `/api/auth/admin/subscriptions/:id/cancel` | Admin | Cancel subscription |
| GET | `/api/auth/admin/institutes` | Admin | List all institutes with stats |

---

## PayHere Payment Gateway — `/api/payhere`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payhere/hash` | — | Generate PayHere payment hash |
| POST | `/api/payhere/checkout` | — | Build PayHere checkout parameters |
| POST | `/api/payhere/notify` | Public (webhook) | PayHere payment notification webhook |

---

## Institute Service — `/api/institutes/:id`

### Auth & User Profiles

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/institutes/:id/auth/firebase/login` | Public | Firebase login (institute user) |
| GET | `/api/institutes/:id/auth/validate` | JWT | Validate token |
| GET | `/api/institutes/:id/auth/me` | JWT | Get own user profile |
| PATCH | `/api/institutes/:id/auth/me` | JWT | Update own profile |
| POST | `/api/institutes/:id/auth/me/face` | JWT | Enroll face descriptor |
| DELETE | `/api/institutes/:id/auth/me/face` | JWT | Remove face enrollment |
| POST | `/api/institutes/:id/auth/me/face/verify` | JWT | Verify identity via webcam image |
| GET | `/api/institutes/:id/auth/info` | Public | Get public institute info |
| GET | `/api/institutes/:id/auth/courses` | Public | Get public course listing |
| GET | `/api/institutes/:id/auth/voice-config` | Public | Get voice agent config |

### Institute Management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/institutes/:id` | JWT | Get institute details |
| GET | `/api/institutes/:id/teachers/count` | JWT | Get teacher count |
| GET | `/api/institutes/:id/enrollment-stats` | JWT | Monthly enrollment stats |
| DELETE | `/api/institutes/:id` | JWT | Delete institute |
| GET | `/api/institutes/:id/roles` | JWT | Get all institute roles |
| POST | `/api/institutes/:id/logo` | JWT | Upload institute logo |

### Institute User Management

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/institutes/:id/users` | JWT | List users (filter: `?role=student\|teacher\|admin`) |
| POST | `/api/institutes/:id/users` | JWT | Create new institute user |
| PATCH | `/api/institutes/:id/users/:userId` | JWT | Update user |
| DELETE | `/api/institutes/:id/users/:userId` | JWT | Delete user |
| PATCH | `/api/institutes/:id/users/:userId/toggle-status` | JWT | Toggle active status |
| GET | `/api/institutes/:id/users/:userId/details` | JWT | Get teacher/user full details |
| POST | `/api/institutes/:id/assign-user` | JWT | Assign existing user to institute |

### Courses

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/institutes/:id/courses` | JWT | Create course |
| GET | `/api/institutes/:id/courses` | Public | List all institute courses |
| GET | `/api/institutes/:id/courses/my-courses` | JWT (teacher) | Teacher's assigned courses |
| GET | `/api/institutes/:id/courses/my-enrolled-courses` | JWT (student) | Student's enrolled courses |
| GET | `/api/institutes/:id/courses/my-assessments` | JWT (teacher) | Teacher's quiz assessments |
| GET | `/api/institutes/:id/courses/student-assessments` | JWT (student) | Student's course quizzes |
| POST | `/api/institutes/:id/courses/student-assessments/:contentId/submit` | JWT (student) | Submit quiz attempt |
| GET | `/api/institutes/:id/courses/student-report` | JWT (teacher) | Per-student scores across courses |
| PATCH | `/api/institutes/:id/courses/:courseId` | JWT | Update course |
| DELETE | `/api/institutes/:id/courses/:courseId` | JWT | Delete course |
| GET | `/api/institutes/:id/courses/:courseId/for-teacher` | JWT (teacher) | Course with modules for teacher |
| POST | `/api/institutes/:id/courses/:courseId/kb-search` | JWT | Semantic search of course knowledge base |

### Course Modules

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/institutes/:id/courses/:courseId/modules` | JWT | Create module |
| GET | `/api/institutes/:id/courses/:courseId/modules` | JWT | List modules |
| GET | `/api/institutes/:id/courses/:courseId/modules/:moduleId` | JWT | Get module |
| PATCH | `/api/institutes/:id/courses/:courseId/modules/:moduleId` | JWT | Update module |
| DELETE | `/api/institutes/:id/courses/:courseId/modules/:moduleId` | JWT | Delete module |

### Module Contents

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `.../modules/:moduleId/contents` | JWT | Create content item |
| POST | `.../modules/:moduleId/contents/upload-file` | JWT | Upload file as content (auto-indexed into KB) |
| GET | `.../modules/:moduleId/contents` | JWT | List contents |
| GET | `.../modules/:moduleId/contents/:contentId` | JWT | Get single content |
| PATCH | `.../modules/:moduleId/contents/:contentId` | JWT | Update content |
| DELETE | `.../modules/:moduleId/contents/:contentId` | JWT | Delete content |

### Teacher Module & Content Shortcuts

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `.../courses/:courseId/teacher-modules` | JWT (teacher) | Teacher creates module |
| PATCH | `.../courses/:courseId/teacher-modules/:moduleId` | JWT (teacher) | Teacher updates module |
| DELETE | `.../courses/:courseId/teacher-modules/:moduleId` | JWT (teacher) | Teacher deletes module |
| POST | `.../teacher-modules/:moduleId/contents` | JWT (teacher) | Teacher creates content |
| POST | `.../teacher-modules/:moduleId/contents/upload-file` | JWT (teacher) | Teacher uploads file |
| PATCH | `.../teacher-modules/:moduleId/contents/:contentId` | JWT (teacher) | Update content |
| DELETE | `.../teacher-modules/:moduleId/contents/:contentId` | JWT (teacher) | Delete content |
| POST | `.../courses/:courseId/teacher-assessment` | JWT (teacher) | Create quiz (smart, creates module inline) |

### Exams

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/institutes/:id/exams` | JWT | Create exam |
| GET | `/api/institutes/:id/exams/my` | JWT (teacher) | Teacher's own exams |
| GET | `/api/institutes/:id/exams/institute` | JWT (admin) | All institute exams |
| GET | `/api/institutes/:id/exams/student` | JWT (student) | Student's available exams |
| GET | `/api/institutes/:id/exams/integrity-flags` | JWT (teacher) | All integrity flags across exams |
| GET | `/api/institutes/:id/exams/:examId` | JWT | Get single exam |
| PATCH | `/api/institutes/:id/exams/:examId` | JWT | Update exam |
| DELETE | `/api/institutes/:id/exams/:examId` | JWT | Delete exam |
| POST | `/api/institutes/:id/exams/:examId/submit` | JWT (student) | Submit exam answers |
| POST | `/api/institutes/:id/exams/:examId/integrity-flag` | JWT (student) | Report integrity violation |
| PATCH | `/api/institutes/:id/exams/:examId/integrity-flag/:flagId/reviewed` | JWT (teacher) | Mark flag as reviewed |
| PATCH | `/api/institutes/:id/exams/:examId/grade-essay/:studentId` | JWT (teacher) | Save AI essay grade |
| POST | `/api/institutes/:id/exams/:examId/live-face-check` | JWT (student) | Periodic live face verification |
| POST | `/api/institutes/:id/exams/:examId/screen-check` | JWT (student) | Screen share analysis |

### Recordings

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/institutes/:id/recordings/categories` | JWT | List recording categories |
| POST | `/api/institutes/:id/recordings/categories` | JWT | Create category |
| PATCH | `/api/institutes/:id/recordings/categories/:categoryId` | JWT | Rename category |
| DELETE | `/api/institutes/:id/recordings/categories/:categoryId` | JWT | Delete category |
| GET | `/api/institutes/:id/recordings` | JWT | List all recordings (search + filter by category) |
| GET | `/api/institutes/:id/recordings/student` | JWT (student) | Get student-accessible recordings |
| GET | `/api/institutes/:id/recordings/:recordingId` | JWT | Get single recording |
| POST | `/api/institutes/:id/recordings` | JWT | Upload new recording (multipart/form-data) |
| PATCH | `/api/institutes/:id/recordings/:recordingId` | JWT | Update recording metadata |
| DELETE | `/api/institutes/:id/recordings/:recordingId` | JWT | Delete recording + MinIO storage |
| POST | `/api/institutes/:id/recordings/:recordingId/assignments` | JWT | Assign recording to course with deadline |
| DELETE | `/api/institutes/:id/recordings/:recordingId/assignments/:assignmentId` | JWT | Remove course assignment |
| GET | `/api/institutes/:id/recordings/:recordingId/video-questions` | JWT | Get timed video questions |
| PUT | `/api/institutes/:id/recordings/:recordingId/video-questions` | JWT | Save/replace all video questions |
| POST | `/api/institutes/:id/recordings/:recordingId/video-attempt` | JWT (student) | Submit video quiz answers |
| GET | `/api/institutes/:id/recordings/:recordingId/video-stats` | JWT (teacher) | Per-student video quiz stats |

### Messages

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/institutes/:id/messages/contacts` | JWT | Get list of contactable users |
| GET | `/api/institutes/:id/messages/conversation/:otherUserId` | JWT | Get conversation thread |
| POST | `/api/institutes/:id/messages` | JWT | Send a message |
| GET | `/api/institutes/:id/messages/unread-counts` | JWT | Unread message counts per contact |

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/institutes/:id/notifications` | JWT | Get all notifications for current user |
| GET | `/api/institutes/:id/notifications/unread-count` | JWT | Unread notification count |
| POST | `/api/institutes/:id/notifications/reminders` | JWT | Create a reminder notification |
| PATCH | `/api/institutes/:id/notifications/:notifId/read` | JWT | Mark notification as read |
| PATCH | `/api/institutes/:id/notifications/mark-all-read` | JWT | Mark all notifications as read |

### Live Classes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/institutes/:id/live-classes` | JWT (teacher) | Create new live session |
| GET | `/api/institutes/:id/live-classes` | JWT | Get all sessions (student view) |
| GET | `/api/institutes/:id/live-classes/teacher` | JWT (teacher) | Teacher's own sessions |
| GET | `/api/institutes/:id/live-classes/:sessionId` | JWT | Get session details |
| GET | `/api/institutes/:id/live-classes/:sessionId/participants` | JWT | List active participants |
| POST | `/api/institutes/:id/live-classes/:sessionId/start` | JWT (teacher) | Start session |
| POST | `/api/institutes/:id/live-classes/:sessionId/end` | JWT (teacher) | End session |
| POST | `/api/institutes/:id/live-classes/:sessionId/join` | JWT (student) | Join session |
| POST | `/api/institutes/:id/live-classes/:sessionId/leave` | JWT | Leave session |
| DELETE | `/api/institutes/:id/live-classes/:sessionId` | JWT (teacher) | Delete session |

### Voice Session Control

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/session/voice/start` | Internal | Start voice agent session |
| POST | `/api/session/voice/end` | Internal | End voice agent session |

---

## AI Core — `http://localhost:8001`

### Quiz Generation

| Method | Path | Description |
|---|---|---|
| POST | `/api/quiz/generate-from-text` | Generate MCQ/essay questions from plain text |
| POST | `/api/quiz/generate-from-file` | Generate questions from PDF/DOCX/PPTX upload |
| POST | `/api/quiz/generate` | Legacy MCQ-only generation from file |

### AI Chat

| Method | Path | Description |
|---|---|---|
| POST | `/api/chat/message` | Institute assistant chat (admin, supports tool calls) |
| POST | `/api/teacher-chat/message` | Teacher AI assistant chat |
| POST | `/api/student-chat/message` | Student AI assistant (supports file attachments) |

### Teacher Tools

| Method | Path | Description |
|---|---|---|
| POST | `/api/teacher-tools/lesson-plan` | Generate lesson plan (optionally with file) |
| POST | `/api/teacher-tools/grade-essay` | AI essay grading with feedback |
| POST | `/api/teacher-tools/class-insights` | Generate class performance insights |
| POST | `/api/teacher-tools/at-risk-analysis` | Analyze at-risk students |

### Voice Assessment

| Method | Path | Description |
|---|---|---|
| POST | `/api/voice-assessment/generate` | Generate voice assessment questions |
| POST | `/api/voice-assessment/evaluate` | Evaluate student voice answers |

### Other

| Method | Path | Description |
|---|---|---|
| POST | `/api/description/generate` | Generate AI description from prompt |
| POST | `/api/transcription/transcribe` | Transcribe audio to text (Gemini, multi-language) |
| POST | `/api/screen/analyze` | Analyze screenshot for academic dishonesty |
| GET | `/health` | Health check |

---

## Facial Recognition Server — `http://localhost:8003`

| Method | Path | Description |
|---|---|---|
| POST | `/api/face/enroll` | Extract face descriptor from uploaded image → returns 512-d array |
| POST | `/api/face/verify` | Compare two descriptors using cosine distance (threshold: 0.30) |
| POST | `/api/face/verify-image` | Verify stored descriptor vs. base64 webcam image |
| GET | `/health` | Health check (returns model + detector backend info) |

**Model:** DeepFace Facenet512
**Distance metric:** Cosine similarity
**Threshold:** ≤ 0.30 = verified

---

## Voice Agent — `http://localhost:8002`

### HTTP Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (SIP server status) |
| GET | `/api/stats` | Runtime statistics dashboard |
| POST | `/api/knowledgebase/search` | Search institute knowledge base in Qdrant |
| POST | `/api/course-kb/index` | Index course document into Qdrant |
| DELETE | `/api/course-kb/document/:docId` | Remove document from Qdrant |

### WebSocket Endpoints

| Path | Description |
|---|---|
| `ws://localhost:8002/ws/{institute_id}/{user_id}/{session_id}` | General institute voice assistant |
| `ws://localhost:8002/ws/teacher/{institute_id}/{teacher_id}/{session_id}` | Teacher voice assistant |
| `ws://localhost:8002/ws/course-qa/{institute_id}/{course_id}/{user_id}/{session_id}` | Course-scoped Q&A voice assistant |
| `ws://localhost:8002/sip` | SIP-over-WebSocket telephony endpoint |

---

## Socket.IO — Real-Time (Institute Service :5003)

### Namespace `/live` — Live Class Events

**Authentication:** JWT in handshake auth.

| Event (client → server) | Payload | Description |
|---|---|---|
| `join_session` | `{ sessionId, instituteId }` | Join a live class room |
| `leave_session` | `{ sessionId, instituteId }` | Leave a live class room |
| `signal` | `{ sessionId, to, signal }` | WebRTC peer signal relay |

| Event (server → client) | Payload | Description |
|---|---|---|
| `session_started` | session data | Teacher started the session |
| `session_ended` | session data | Teacher ended the session |
| `participant_update` | participants array | Participant joined or left |
| `signal` | `{ from, signal }` | WebRTC peer signal from another user |

### Namespace `/messages` — Direct Messaging

| Event (server → client) | Payload | Description |
|---|---|---|
| `new_message` | message object | New message received |
| `message_sent` | message object | Message sent confirmation (multi-tab sync) |

### Namespace `/notifications` — Push Notifications

| Event (server → client) | Payload | Description |
|---|---|---|
| `new_notification` | notification object | New push notification (cheat alerts, messages, reminders) |

---

## Request / Response Conventions

### JWT Payload
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "teacher",
  "instituteId": "institute-uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Validation error description",
  "error": "Bad Request"
}
```

### File Upload
Files are uploaded as `multipart/form-data`. The service stores them in MinIO (`smartedx-bucket`) and returns a URL in the response.

### Pagination
List endpoints support optional query params: `?page=1&limit=20&search=keyword`

### Institute Scoping
All Institute Service endpoints are scoped to `:id` (the `instituteId`). The JWT must carry a matching `instituteId` or the request will be rejected.
