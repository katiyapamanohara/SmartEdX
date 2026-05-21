import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly aiCoreUrl: string;
  private readonly faceRecUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiCoreUrl =
      this.configService.get<string>('AI_CORE_URL') || 'http://localhost:8001';
    this.faceRecUrl =
      this.configService.get<string>('FACE_REC_URL') || 'http://localhost:8003';
  }

  async forwardRequest(
    path: string,
    method: string,
    body?: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding ${method} ${url}`);

    try {
      // Chat/LLM endpoints can take up to 2 minutes — use a generous timeout
      const isLlmPath =
        path.includes('chat') ||
        path.includes('description') ||
        path.includes('quiz') ||
        path.includes('teacher-tools');
      const timeoutMs = isLlmPath ? 120_000 : 30_000;

      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data: body,
          headers: this.filterHeaders(headers),
          validateStatus: (status) => status < 600,
          timeout: timeoutMs,
        }),
      );

      if (response.status >= 400) {
        throw new HttpException(response.data, response.status);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `AI Core error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(`Error forwarding to ${url}: ${error.message}`);
      throw error;
    }
  }

  async forwardFileUpload(
    path: string,
    file: Express.Multer.File | undefined,
    body: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding file upload to ${url}`);

    const formData = new FormData();

    if (file) {
      // Direct browser file upload
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.size,
      });
    } else if (body.document_url) {
      // Fetch the course document server-side to avoid CORS from the browser
      this.logger.log(`Fetching course document server-side: ${body.document_url}`);
      const docRes = await firstValueFrom(
        this.httpService.get(body.document_url, {
          responseType: 'arraybuffer',
          validateStatus: () => true,
        }),
      );
      if (docRes.status >= 400) {
        throw new HttpException(
          { detail: 'Failed to fetch the selected course document' },
          422,
        );
      }
      const buffer = Buffer.from(docRes.data as ArrayBuffer);
      const rawUrl = (body.document_url as string).split('?')[0];
      const rawExt = rawUrl.split('.').pop()?.toLowerCase() ?? 'pdf';
      const safeExt = ['pdf', 'docx', 'doc', 'pptx', 'ppt'].includes(rawExt)
        ? rawExt
        : 'pdf';
      const contentType =
        (docRes.headers['content-type'] as string)?.split(';')[0] ||
        'application/pdf';
      formData.append('file', buffer, {
        filename: `course-document.${safeExt}`,
        contentType,
        knownLength: buffer.length,
      });
    }

    if (body.num_questions)
      formData.append('num_questions', String(body.num_questions));
    if (body.difficulty) formData.append('difficulty', body.difficulty);
    if (body.question_type) formData.append('question_type', body.question_type);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          url,
          data: formData,
          headers: {
            ...formData.getHeaders(),
            ...(headers?.authorization
              ? { authorization: headers.authorization }
              : {}),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status < 600,
          timeout: 180_000, // allow for up to 3 retries with backoff in ai_core
        }),
      );

      if (response.status >= 400) {
        this.logger.warn(
          `AI Core returned ${response.status} for ${path}: ${JSON.stringify(response.data)}`,
        );
        throw new HttpException(response.data, response.status);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `AI Core upload error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(
        `Error forwarding file upload to ${url}: ${error.message}`,
      );
      throw error;
    }
  }

  async forwardVoiceAssessmentGenerate(
    path: string,
    file: Express.Multer.File | undefined,
    body: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding voice assessment generation to ${url}`);

    const formData = new FormData();
    const textFields = ['instructions', 'num_questions', 'marks_per_question'];
    for (const field of textFields) {
      if (body[field] !== undefined)
        formData.append(field, String(body[field]));
    }

    if (file) {
      // Direct browser file upload
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.size,
      });
    } else if (body.document_url) {
      // Fetch the course document server-side to avoid CORS from the browser
      this.logger.log(`Fetching course document server-side: ${body.document_url}`);
      const docRes = await firstValueFrom(
        this.httpService.get(body.document_url, {
          responseType: 'arraybuffer',
          validateStatus: () => true,
        }),
      );
      if (docRes.status >= 400) {
        throw new HttpException(
          { detail: 'Failed to fetch the selected course document' },
          422,
        );
      }
      const buffer = Buffer.from(docRes.data as ArrayBuffer);
      const rawUrl = (body.document_url as string).split('?')[0];
      const rawExt = rawUrl.split('.').pop()?.toLowerCase() ?? 'pdf';
      const safeExt = ['pdf', 'docx', 'doc', 'pptx', 'ppt'].includes(rawExt)
        ? rawExt
        : 'pdf';
      const contentType =
        (docRes.headers['content-type'] as string)?.split(';')[0] ||
        'application/pdf';
      formData.append('file', buffer, {
        filename: `course-document.${safeExt}`,
        contentType,
        knownLength: buffer.length,
      });
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          url,
          data: formData,
          headers: {
            ...formData.getHeaders(),
            ...(headers?.authorization
              ? { authorization: headers.authorization }
              : {}),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status < 600,
          timeout: 120_000,
        }),
      );
      if (response.status >= 400) {
        this.logger.warn(
          `AI Core returned ${response.status} for voice-assessment/generate: ${JSON.stringify(response.data)}`,
        );
        throw new HttpException(response.data, response.status);
      }
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `Voice assessment error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      throw error;
    }
  }

  async forwardStudentChat(
    path: string,
    file: Express.Multer.File | undefined,
    body: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding student chat to ${url}`);

    const formData = new FormData();

    const textFields = [
      'messages',
      'institute_id',
      'student_id',
      'context',
      'auth_token',
    ];
    for (const field of textFields) {
      if (body[field] !== undefined)
        formData.append(field, String(body[field]));
    }

    if (file) {
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.size,
      });
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          url,
          data: formData,
          headers: {
            ...formData.getHeaders(),
            ...(headers?.authorization
              ? { authorization: headers.authorization }
              : {}),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status < 500,
          timeout: 120_000,
        }),
      );

      if (response.status >= 400) {
        throw new HttpException(response.data, response.status);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `Student chat error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(
        `Error forwarding student chat to ${url}: ${error.message}`,
      );
      throw error;
    }
  }

  async forwardTeacherChat(
    path: string,
    file: Express.Multer.File | undefined,
    body: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding teacher chat to ${url}`);

    const formData = new FormData();

    // Append all text fields
    const textFields = [
      'messages',
      'institute_id',
      'teacher_id',
      'context',
      'auth_token',
    ];
    for (const field of textFields) {
      if (body[field] !== undefined)
        formData.append(field, String(body[field]));
    }

    // Append file if present
    if (file) {
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.size,
      });
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          url,
          data: formData,
          headers: {
            ...formData.getHeaders(),
            ...(headers?.authorization
              ? { authorization: headers.authorization }
              : {}),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status < 500,
          timeout: 120_000,
        }),
      );

      if (response.status >= 400) {
        throw new HttpException(response.data, response.status);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `Teacher chat error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(
        `Error forwarding teacher chat to ${url}: ${error.message}`,
      );
      throw error;
    }
  }

  async forwardTeacherToolsLessonPlan(
    path: string,
    file: Express.Multer.File | undefined,
    body: any,
    headers?: any,
  ): Promise<any> {
    // If no file — forward as plain JSON so the AI core can use its Pydantic model directly
    if (!file) {
      return this.forwardRequest(path, 'POST', body, headers);
    }

    // With a file — send as multipart so the AI core can extract its text
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding lesson plan file upload to ${url}`);

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });

    const textFields = [
      'topic', 'subject', 'gradeLevel', 'durationMinutes', 'objectives', 'additionalContext',
    ];
    for (const field of textFields) {
      if (body[field] !== undefined) formData.append(field, String(body[field]));
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          url,
          data: formData,
          headers: {
            ...formData.getHeaders(),
            ...(headers?.authorization ? { authorization: headers.authorization } : {}),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status < 500,
          timeout: 120_000,
        }),
      );
      if (response.status >= 400) throw new HttpException(response.data, response.status);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(`Lesson plan upload error: ${error.response.status}`);
        throw new HttpException(error.response.data, error.response.status);
      }
      throw error;
    }
  }

  async forwardAudioTranscription(
    path: string,
    audio: Express.Multer.File,
    headers?: any,
  ): Promise<any> {
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding audio transcription to ${url}`);

    const formData = new FormData();
    formData.append('audio', audio.buffer, {
      filename: audio.originalname,
      contentType: audio.mimetype,
      knownLength: audio.size,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method: 'POST',
          url,
          data: formData,
          headers: {
            ...formData.getHeaders(),
            ...(headers?.authorization
              ? { authorization: headers.authorization }
              : {}),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status < 500,
          timeout: 60_000,
        }),
      );

      if (response.status >= 400) {
        throw new HttpException(response.data, response.status);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `Transcription error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(
        `Error forwarding audio transcription to ${url}: ${error.message}`,
      );
      throw error;
    }
  }

  async forwardFaceBase64(
    path: string,
    imageB64: string,
    headers: any,
  ): Promise<any> {
    const url = `${this.faceRecUrl}/${path}`;
    this.logger.log(`Forwarding face base64 enrollment to ${url}`);
    const form = new FormData();
    form.append('image_b64', imageB64);
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, form, {
          headers: {
            ...form.getHeaders(),
            ...(headers?.authorization
              ? { authorization: headers.authorization }
              : {}),
          },
          maxBodyLength: Infinity,
          timeout: 120_000, // DeepFace model loading + inference can be slow
          validateStatus: (s) => s < 600,
        }),
      );
      if (response.status >= 400)
        throw new HttpException(response.data, response.status);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `Face server error ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(
        `Face base64 connection error: ${error.message} — is the face server running on ${this.faceRecUrl}?`,
      );
      throw new HttpException(
        { detail: `Cannot reach face recognition server: ${error.message}` },
        502,
      );
    }
  }

  async forwardFaceJson(
    path: string,
    method: string,
    body: any,
    headers: any,
  ): Promise<any> {
    const url = `${this.faceRecUrl}/${path}`;
    this.logger.log(`Forwarding face ${method} ${url}`);
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url,
          method,
          data: body,
          headers: {
            ...this.filterHeaders(headers),
            'content-type': 'application/json',
          },
          timeout: 30_000,
          validateStatus: (s) => s < 500,
        }),
      );
      if (response.status >= 400)
        throw new HttpException(response.data, response.status);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response)
        throw new HttpException(error.response.data, error.response.status);
      this.logger.error(`Face proxy error: ${error.message}`);
      throw error;
    }
  }

  async forwardFaceUpload(
    path: string,
    file: Express.Multer.File,
    headers: any,
  ): Promise<any> {
    const url = `${this.faceRecUrl}/${path}`;
    this.logger.log(`Forwarding face upload ${url}`);
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, form, {
          headers: {
            authorization: headers.authorization,
            ...form.getHeaders(),
          },
          maxBodyLength: Infinity,
          timeout: 30_000,
          validateStatus: (s) => s < 500,
        }),
      );
      if (response.status >= 400)
        throw new HttpException(response.data, response.status);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response)
        throw new HttpException(error.response.data, error.response.status);
      this.logger.error(`Face upload proxy error: ${error.message}`);
      throw error;
    }
  }

  private filterHeaders(headers: any): any {
    const allowed = ['authorization', 'content-type', 'accept', 'user-agent'];
    return Object.keys(headers).reduce((acc, key) => {
      if (allowed.includes(key.toLowerCase())) acc[key] = headers[key];
      return acc;
    }, {} as any);
  }
}
