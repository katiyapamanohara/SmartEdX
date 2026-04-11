# SmartEdX — Feature Reference

Detailed breakdown of every major feature in the platform, where it lives in the codebase, and how it works end-to-end.

---

## Course Management

### What it does
Teachers create courses, divide them into modules, and add learning materials (videos, PDFs, DOCX, quizzes). Content is ordered and browsable by enrolled students.

### How it works

1. Institute admin creates a course and assigns a teacher.
2. Teacher creates modules and adds content items within each module.
3. For file-based content (PDF, DOCX), the file is uploaded to **MinIO** and the text is auto-extracted and indexed into **Qdrant** for the course knowledge base.
4. Students enrolled in the course can browse modules and open content.

### Key endpoints
```
GET    /api/institutes/:id/courses                         → list all courses
GET    /api/institutes/:id/courses/my-courses              → teacher's assigned courses
GET    /api/institutes/:id/courses/:courseId/for-teacher   → course detail with modules
POST   /api/institutes/:id/courses/:courseId/teacher-modules              → create module
POST   /api/institutes/:id/courses/:courseId/teacher-modules/:moduleId/contents → add content
POST   /api/institutes/:id/courses/:courseId/teacher-modules/:moduleId/contents/upload-file → upload file
```

---

## Quiz Assessments

### What it does
Teachers create quiz assessments inside course modules. Students take quizzes, scores are recorded per attempt, and teachers can view performance analytics.

### How it works

1. Teacher creates a quiz (manually or AI-generated) via `POST .../teacher-assessment`.
2. Quiz data (questions, options, correct answers, marks) is stored in `module_contents.quizData` as JSONB.
3. Student submits answers → `POST .../student-assessments/:contentId/submit`.
4. Score is calculated and stored in `module_contents.studentAttempts[userId]`.
5. Max attempts per student is enforced (`quizData.maxAttempts`).

### AI-generated quizzes
Teachers can auto-generate questions by sending course text to the AI Core:
```
POST /api/ai/quiz/generate-from-text
{ "text": "...", "numQuestions": 10, "difficulty": "medium", "questionType": "mcq" }
```

### Key endpoints
```
GET  /api/institutes/:id/courses/my-assessments                           → teacher's quizzes
GET  /api/institutes/:id/courses/student-assessments                      → student's quizzes
POST /api/institutes/:id/courses/student-assessments/:contentId/submit    → submit attempt
```

---

## Exams

### What it does
Structured timed assessments with MCQ and essay questions. Exams support face verification at entry, integrity monitoring throughout, and per-student attempt tracking.

### How it works

1. Teacher creates an exam with questions (MCQ or essay) and settings (time limit, face ID requirement, max attempts).
2. Student opens the exam — if face ID is required, webcam capture is sent to the **Facial Recognition Service** for verification.
3. During the exam, the frontend monitors:
   - Tab/window focus loss
   - Face detection (present, multiple, absent)
   - Fullscreen exits
   - Camera disable
4. Each violation is POSTed to the backend and stored in `exam.integrityFlags[userId]`.
5. On submit, answers and score are stored in `exam.studentAttempts[userId]`.
6. Teacher views the integrity monitor dashboard to review flagged students.

### Data shape (stored as JSONB)
```json
studentAttempts: {
  "userId": {
    "score": 85,
    "totalMarks": 100,
    "passed": true,
    "submittedAt": "2026-04-11T09:00:00Z",
    "answers": { "q1": 2, "q2": 0 }
  }
}

integrityFlags: {
  "userId": [
    { "type": "tab_switch", "severity": "medium", "timestamp": "...", "reviewed": false }
  ]
}
```

---

## Face Verification (Exam Proctoring)

### What it does
Verifies student identity before allowing exam access using face recognition.

### How it works

1. **Enrollment:** Student uploads a clear face photo. The Institute Service calls the Facial Recognition Server to extract a 512-dimensional face descriptor (Facenet512 model). The descriptor is stored on `student.faceDescriptor` in PostgreSQL.
2. **Verification:** At exam start, a webcam frame is captured client-side. The Institute Service:
   - Retrieves the stored descriptor from the student record
   - Sends both descriptors to `POST http://facial-rec:8003/face/verify`
   - If cosine distance < 0.30 → identity confirmed
   - If no match → exam access denied, violation logged

### Facial Recognition Service endpoints
```
POST /face/enroll   { "image": "<base64>" }          → returns descriptor[]
POST /face/verify   { "desc1": [], "desc2": [] }     → { match: bool, distance: float }
```

---

## Exam Integrity Monitor

### What it does
A teacher-facing dashboard showing all integrity violation events across their exams. Teachers can filter by status (pending/reviewed) and mark events as reviewed.

### Violation types tracked
| Type | Severity | Trigger |
|------|----------|---------|
| `tab_switch` | medium | Browser tab lost focus |
| `window_blur` | low | Window lost focus |
| `face_not_detected` | high | Face absent for 5+ seconds |
| `multiple_faces` | high | More than one face detected |
| `camera_disabled` | high | Camera access revoked |
| `fullscreen_exit` | medium | Exam fullscreen exited |
| `face_verify_failed` | critical | Identity mismatch at start |

### Key endpoints
```
GET   /api/institutes/:id/exams/integrity-flags          → all flags for teacher's exams
PATCH /api/institutes/:id/exams/:examId/integrity-flags/:studentId/review → mark reviewed
```

---

## Video Recordings

### What it does
Teachers upload and manage video lecture recordings, assign them to courses, and set student access deadlines. Students watch recordings through an integrated player.

### How it works

1. Teacher uploads a recording (URL or file), assigns a category and optionally a course + deadline.
2. Students can only access recordings assigned to their enrolled courses and within the active deadline.
3. Backend enforces this at the query level — expired recordings are excluded from student responses.

### Key endpoints
```
GET  /api/institutes/:id/recordings           → all recordings (teacher/admin)
GET  /api/institutes/:id/recordings/student   → student's active, enrolled recordings only
POST /api/institutes/:id/recordings           → create recording
```

---

## Timed Video Questions

### What it does
Teachers embed quiz questions at specific timestamps in a recording. When a student watches the video and reaches that timestamp, playback pauses and the question appears. Answers are collected and submitted when the player closes. Teachers see per-question accuracy and per-student scores.

### How it works

1. Teacher opens the question manager for a recording, adds questions with an `atSeconds` value (e.g., 120 = 2:00 into the video).
2. Questions are stored in `recording.videoQuestions` as JSONB, sorted by `atSeconds`.
3. When the student plays the video, the frontend polls `currentTime` on every `timeupdate` event.
4. When `currentTime >= question.atSeconds` and the question hasn't been answered, video pauses and the question overlay appears.
5. Student answers (or skips) each question; answers are collected client-side.
6. When the player closes, all collected answers are submitted in a single batch to `/video-attempt`.
7. Scores are stored in `recording.quizAttempts[userId]` as JSONB.

### Auto-generation
Teachers can generate questions automatically — the AI Core is called with the recording title as context, and questions are distributed at 2-minute intervals. Teachers adjust timestamps manually as needed.

### Key endpoints
```
GET  /api/institutes/:id/recordings/:recordingId/video-questions  → questions (correct answers hidden for students)
PUT  /api/institutes/:id/recordings/:recordingId/video-questions  → save question set (teacher)
POST /api/institutes/:id/recordings/:recordingId/video-attempt    → submit batch answers (student)
GET  /api/institutes/:id/recordings/:recordingId/video-stats      → per-question + per-student stats (teacher)
```

### Data shape
```json
videoQuestions: [
  {
    "id": "uuid",
    "atSeconds": 120,
    "question": "What is the time complexity of binary search?",
    "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    "correctAnswer": 1,
    "marks": 2
  }
]

quizAttempts: {
  "userId": {
    "answers": { "questionId": 1 },
    "completedAt": "2026-04-11T10:00:00Z"
  }
}
```

---

## Voice Learning Agent

### What it does
Students can have a real-time spoken conversation with an AI tutor powered by Google Gemini Live. The agent answers questions grounded in the course's knowledge base (indexed PDFs and documents).

### How it works

1. Student opens the voice agent session from a course page.
2. Frontend connects via WebSocket to the API Gateway, which proxies to the Voice Agent.
3. Voice Agent initialises a Gemini Live session with course context.
4. Student speaks → audio streams to Gemini → response audio streams back in real time.
5. When the student asks a content question, the agent queries **Qdrant** for semantically relevant chunks from the course's indexed documents.
6. Session start/end is recorded in the Institute Service.

### Course Knowledge Base
Documents are indexed when a teacher uploads a PDF or DOCX:
1. Text is extracted from the file.
2. Text is chunked and embedded using FastEmbed.
3. Embeddings are stored in Qdrant under a collection keyed to the course ID.
4. During voice sessions, student queries are embedded and matched against stored chunks.

---

## AI Quiz Generation

### What it does
Generates complete MCQ or essay quiz questions from any text or document. Used by teachers when creating assessments or adding questions to video recordings.

### Input sources
- Raw text (paste from anywhere)
- Uploaded PDF / DOCX / PPTX
- Video recording title (for timed video questions)

### Configuration options
| Parameter | Options |
|-----------|---------|
| `numQuestions` | 1–20 |
| `difficulty` | `easy`, `medium`, `hard` |
| `questionType` | `mcq`, `essay`, `mixed` |

### LLM provider selection
Set `AI_PROVIDER` in AI Core's `.env` to switch between Anthropic, OpenAI, and Google Gemini without code changes.

---

## Live Sessions

### What it does
Real-time virtual class sessions where teachers broadcast and students participate. Powered by Socket.IO.

### How it works

1. Teacher creates and starts a live session.
2. Students join and appear in the participant list.
3. Messages, reactions, and events are broadcast over Socket.IO to all participants.
4. Session end is recorded with participant counts and duration.

### Key endpoints
```
POST /api/institutes/:id/live-sessions        → create session
PATCH /api/institutes/:id/live-sessions/:id   → start/end session
GET  /api/institutes/:id/live-sessions        → list sessions
```

---

## Student Reporting

### What it does
Teachers see a consolidated performance report for every student across all their courses. Includes quiz averages, exam averages, overall grade, and per-student breakdowns.

### How it works

1. Backend aggregates: for each student enrolled in the teacher's courses, collect all quiz attempt scores from `module_contents.studentAttempts` and all exam scores from `exam.studentAttempts`.
2. Frontend combines quiz data (from `/courses/student-report`) and exam data (from `/exams/my`) in a `useMemo`.
3. Scores are averaged, graded (A–F), and displayed in a sortable, filterable table.

### Export options
- **CSV (per student):** Downloads a CSV with that student's quiz and exam rows.
- **CSV (all students):** Bulk export of the filtered student list with aggregate scores.
- **PDF (per student):** Opens a print-ready HTML page with the student's full report and triggers `window.print()`.

### Key endpoint
```
GET /api/institutes/:id/courses/student-report   → all students with quiz scores across teacher's courses
```

---

## Multi-Tenancy & Role Management

### What it does
Multiple independent institutes can operate on a single SmartEdX deployment, each with their own users, courses, and data.

### Roles

| Role | Scope | Capabilities |
|------|-------|-------------|
| Super Admin | Global | Full system access, institute management |
| Institute Admin | Institute | Manage users, courses, settings within their institute |
| Teacher | Institute | Manage assigned courses, create content, view reports |
| Student | Institute | Enroll in courses, take quizzes and exams, watch recordings |

### Authentication flow

1. User logs in via Firebase (email/password or social) or directly with credentials.
2. SaaS Service validates credentials and issues a JWT containing `userId`, `instituteId`, and `role`.
3. JWT is included in all subsequent requests as a `Bearer` token.
4. Institute Service and SaaS Service both validate the JWT using the shared `JWT_SECRET`.
5. The `@CurrentUser()` decorator extracts the user context from the verified token in any controller.

---

## Notifications

### What it does
Real-time in-app notifications delivered to users via Socket.IO as events occur (e.g., new assignment, exam reminder, live session start).

### Key endpoints
```
GET   /api/institutes/:id/notifications          → user's notifications
PATCH /api/institutes/:id/notifications/:id/read → mark as read
```

---

## File Storage (MinIO)

### What it does
All uploaded files — profile pictures, course PDFs, DOCX files, videos — are stored in MinIO, an S3-compatible object store.

### Bucket structure
```
smartedx-bucket/
  institutes/
    [instituteId]/
      courses/
        [courseId]/
          [filename]         ← course content files
      recordings/
        [recordingId]/
          [filename]         ← video files
      profiles/
        [userId]/
          [filename]         ← profile pictures
```

### Access
Files are served publicly from the `smartedx-bucket` bucket. Presigned URLs are generated for private files when needed.
