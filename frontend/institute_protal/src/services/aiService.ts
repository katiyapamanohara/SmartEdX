import { authService } from "./authService";
import type { ExamQuestion } from "./examService";

export interface GenerateFromTextPayload {
  text: string;
  num_questions: number;
  difficulty: "easy" | "medium" | "hard";
  question_type: "mcq" | "essay" | "both";
}

export interface GenerateFromFilePayload {
  file: File;
  num_questions: number;
  difficulty: "easy" | "medium" | "hard";
  question_type: "mcq" | "essay" | "both";
}

class AIService {
  private readonly apiUrl = process.env.NEXT_PUBLIC_API_URL;

  private jsonHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${authService.getToken()}`,
      "Content-Type": "application/json",
    };
  }

  private authHeader(): HeadersInit {
    return { Authorization: `Bearer ${authService.getToken()}` };
  }

  // ── Quiz / Question Generation ─────────────────────────────────────────────

  async generateQuestionsFromText(payload: GenerateFromTextPayload): Promise<ExamQuestion[] | null> {
    const res = await fetch(`${this.apiUrl}/api/ai/quiz/generate-from-text`, {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.questions ?? null;
  }

  async generateQuestionsFromFile(payload: GenerateFromFilePayload): Promise<ExamQuestion[] | null> {
    const form = new FormData();
    form.append("file", payload.file);
    form.append("num_questions", String(payload.num_questions));
    form.append("difficulty", payload.difficulty);
    form.append("question_type", payload.question_type);

    const res = await fetch(`${this.apiUrl}/api/ai/quiz/generate-from-file`, {
      method: "POST",
      headers: this.authHeader(),
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.questions ?? null;
  }
}

export const aiService = new AIService();
