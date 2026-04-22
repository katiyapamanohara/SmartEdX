import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ShortAnswerGradeResult {
  score: number;
  maxMarks: number;
  percentage: number;
  feedback: string;
  alignmentScore: number; // 0-100 semantic similarity
  keywordsMatched: string[];
  keywordsMissed: string[];
}

@Injectable()
export class AiCoreClient {
  private readonly logger = new Logger(AiCoreClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'AI_CORE_URL',
      'http://localhost:8001',
    );
  }

  async gradeShortAnswer(
    question: string,
    studentAnswer: string,
    maxMarks: number,
    sampleAnswer: string,
    keywords: string[],
  ): Promise<ShortAnswerGradeResult | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/teacher-tools/grade-short-answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            studentAnswer,
            maxMarks,
            sampleAnswer,
            keywords,
          }),
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `[ai-core] grade-short-answer returned ${response.status}`,
        );
        return null;
      }
      return response.json();
    } catch (err) {
      this.logger.error(`[ai-core] grade-short-answer failed: ${err}`);
      return null;
    }
  }

  async getAdaptiveRecommendations(payload: {
    studentId: string;
    weakTopics: Array<{ topic: string; score: number; maxScore: number }>;
    strongTopics: Array<{ topic: string; score: number; maxScore: number }>;
    overallAverage: number;
  }): Promise<{ recommendations: string[]; studyPlan: string } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/ai-tools/adaptive-recommendations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `[ai-core] adaptive-recommendations returned ${response.status}`,
        );
        return null;
      }
      return response.json();
    } catch (err) {
      this.logger.error(`[ai-core] adaptive-recommendations failed: ${err}`);
      return null;
    }
  }
}
