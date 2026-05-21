import { authService } from "./authService";

export type ExamStatus = "draft" | "scheduled" | "active" | "completed";
export type QuestionType = "mcq" | "essay" | "short_answer";

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  // MCQ only
  options?: [string, string, string, string];
  correctAnswer?: number; // hidden for active exams on student side
  explanation?: string;
  // Essay / short_answer
  sampleAnswer?: string;
  keywords?: string[];
  marks: number;
}

export interface ExamAttempt {
  answers: Record<string, number | string>;
  score: number;
  totalMarks: number;
  passed: boolean;
  submittedAt: string;
  pendingEssayReview?: boolean;
  attemptCount?: number;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  courseId: string;
  courseName?: string;
  scheduledAt?: string;
  durationMinutes: number;
  status: ExamStatus;
  passingScore: number;
  totalMarks: number;
  questionCount: number;
  questions: ExamQuestion[];
  requireScreenShare: boolean;
  autoFailOnCheat: boolean;
  maxAttempts: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  myAttempt?: (ExamAttempt & { autoFailed?: boolean }) | null;
  /** Teacher/admin only — all student attempts keyed by userId */
  studentAttempts?: Record<string, ExamAttempt & { attemptCount?: number; autoFailed?: boolean }>;
}

export interface CreateExamPayload {
  title: string;
  description?: string;
  instructions?: string;
  courseId: string;
  scheduledAt?: string;
  durationMinutes: number;
  passingScore: number;
  requireScreenShare?: boolean;
  autoFailOnCheat?: boolean;
  maxAttempts?: number;
  questions: ExamQuestion[];
}


class ExamService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${authService.getToken()}`,
      "Content-Type": "application/json",
    };
  }

  private base(instituteId: string) {
    return `${this.apiUrl}/api/institutes/institutes/${instituteId}/exams`;
  }

  // ── Teacher / Institute ────────────────────────────────────────────────────

  async createExam(instituteId: string, payload: CreateExamPayload): Promise<Exam | null> {
    const res = await fetch(this.base(instituteId), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async getMyExams(instituteId: string): Promise<Exam[]> {
    const res = await fetch(`${this.base(instituteId)}/my`, { headers: this.headers() });
    if (!res.ok) return [];
    return res.json();
  }

  async getAllExams(instituteId: string): Promise<Exam[]> {
    const res = await fetch(`${this.base(instituteId)}/institute`, { headers: this.headers() });
    if (!res.ok) return [];
    return res.json();
  }

  async updateExam(
    instituteId: string,
    examId: string,
    payload: Partial<CreateExamPayload> & { status?: ExamStatus }
  ): Promise<Exam | null> {
    const res = await fetch(`${this.base(instituteId)}/${examId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async deleteExam(instituteId: string, examId: string): Promise<boolean> {
    const res = await fetch(`${this.base(instituteId)}/${examId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    return res.ok;
  }

  // ── Student ───────────────────────────────────────────────────────────────

  async getStudentExams(instituteId: string): Promise<Exam[]> {
    const res = await fetch(`${this.base(instituteId)}/student`, { headers: this.headers() });
    if (!res.ok) return [];
    return res.json();
  }

  async submitExam(
    instituteId: string,
    examId: string,
    answers: Record<string, number | string>
  ): Promise<{ score: number; totalMarks: number; percentage: number; passed: boolean; passingScore: number; pendingEssayReview?: boolean } | null> {
    const res = await fetch(`${this.base(instituteId)}/${examId}/submit`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async reportIntegrityFlag(
    instituteId: string,
    examId: string,
    type: "tab_switch" | "fullscreen_exit" | "screen_share_disabled" | "suspicious_screen" | "copy_attempt"
  ): Promise<{ autoFailed?: boolean }> {
    try {
      const res = await fetch(`${this.base(instituteId)}/${examId}/integrity-flag`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ type }),
      });
      if (res.ok) return res.json();
    } catch {
      // fire-and-forget — never block the student
    }
    return {};
  }

  async screenCheck(
    instituteId: string,
    examId: string,
    imageB64: string,
  ): Promise<{ suspicious: boolean; reason: string; autoFailed: boolean } | null> {
    try {
      const res = await fetch(`${this.base(instituteId)}/${examId}/screen-check`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ image_b64: imageB64 }),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async getIntegrityFlags(instituteId: string): Promise<{
    flagId: string; examId: string; examTitle: string; userId: string;
    studentName: string; type: string; severity: string; timestamp: string; reviewed: boolean;
  }[]> {
    const res = await fetch(`${this.base(instituteId)}/integrity-flags`, { headers: this.headers() });
    if (!res.ok) return [];
    return res.json();
  }

  async markFlagReviewed(
    instituteId: string,
    examId: string,
    flagId: string,
    userId: string
  ): Promise<boolean> {
    const res = await fetch(`${this.base(instituteId)}/${examId}/integrity-flag/${flagId}/reviewed`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ userId }),
    });
    return res.ok;
  }

}

export const examService = new ExamService();
