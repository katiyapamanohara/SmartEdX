import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface KbSearchResult {
  content: string;
  page: number | null;
  title: string;
  score: number;
}

export interface IndexContentPayload {
  institute_id: string;
  course_id: string;
  course_name: string;
  content_id: string;
  file_url: string;
  file_type: string;
  title: string;
}

/**
 * Thin HTTP client for the Voice Agent service.
 *
 * Calls are fire-and-forget where appropriate (indexing) so that teacher
 * uploads are not blocked by embedding latency.  Errors are logged but
 * never propagated to the caller.
 *
 * Each course has its own Qdrant collection named:
 *   kb_{institute_id}_{course_id}
 */
@Injectable()
export class VoiceAgentClient {
  private readonly logger = new Logger(VoiceAgentClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'VOICE_AGENT_URL',
      'http://localhost:8000',
    );
  }

  /**
   * Pre-create the Qdrant collection for a course (idempotent).
   * Called when a course is created so the collection exists before any content is uploaded.
   */
  async ensureCourseCollection(
    instituteId: string,
    courseId: string,
  ): Promise<void> {
    const url = `${this.baseUrl}/api/course-kb/${encodeURIComponent(instituteId)}/${encodeURIComponent(courseId)}/ensure-collection`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.warn(
          `[voice-agent] ensure-collection returned ${response.status} for course ${courseId}`,
        );
      } else {
        this.logger.log(
          `[voice-agent] Ensured Qdrant collection for course ${courseId} (institute: ${instituteId})`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[voice-agent] Failed to ensure collection for course ${courseId}: ${err}`,
      );
    }
  }

  /**
   * Queue a PDF or Word document for embedding into the course's dedicated
   * Qdrant collection (kb_{institute_id}_{course_id}).
   * Returns immediately — the voice agent indexes asynchronously.
   */
  async indexContent(payload: IndexContentPayload): Promise<void> {
    const url = `${this.baseUrl}/api/course-kb/index`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.warn(
          `[voice-agent] index request returned ${response.status} for content ${payload.content_id}`,
        );
      } else {
        this.logger.log(
          `[voice-agent] Queued indexing for content ${payload.content_id} (course: ${payload.course_name}, institute: ${payload.institute_id})`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[voice-agent] Failed to queue indexing for content ${payload.content_id}: ${err}`,
      );
    }
  }

  /**
   * Semantic search within a course's Qdrant collection.
   * Returns the top matching content chunks for the given query.
   */
  async searchCourseKB(
    instituteId: string,
    courseId: string,
    query: string,
    limit = 3,
  ): Promise<KbSearchResult[]> {
    const url = `${this.baseUrl}/api/course-kb/search`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institute_id: instituteId,
          course_id: courseId,
          query,
          limit,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        this.logger.warn(`[voice-agent] kb-search returned ${response.status}`);
        return [];
      }
      const data = await response.json();
      return (data.results ?? []) as KbSearchResult[];
    } catch (err) {
      this.logger.error(`[voice-agent] kb-search failed: ${err}`);
      return [];
    }
  }

  /**
   * Remove all Qdrant points for a content_id from the course's collection.
   */
  async deleteContent(
    instituteId: string,
    courseId: string,
    contentId: string,
  ): Promise<void> {
    const url = `${this.baseUrl}/api/course-kb/${encodeURIComponent(instituteId)}/${encodeURIComponent(courseId)}/content/${encodeURIComponent(contentId)}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.warn(
          `[voice-agent] delete request returned ${response.status} for content ${contentId}`,
        );
      } else {
        this.logger.log(
          `[voice-agent] Deleted KB content ${contentId} from kb_${instituteId}_${courseId}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `[voice-agent] Failed to delete KB content ${contentId}: ${err}`,
      );
    }
  }
}
