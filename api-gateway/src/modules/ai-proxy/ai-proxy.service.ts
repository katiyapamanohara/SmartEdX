import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly aiCoreUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiCoreUrl =
      this.configService.get<string>('AI_CORE_URL') || 'http://localhost:8001';
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
      const isLlmPath = path.includes('chat') || path.includes('description') || path.includes('quiz');
      const timeoutMs = isLlmPath ? 120_000 : 30_000;

      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data: body,
          headers: this.filterHeaders(headers),
          validateStatus: (status) => status < 500,
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
        this.logger.error(`AI Core error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(`Error forwarding to ${url}: ${error.message}`);
      throw error;
    }
  }

  async forwardFileUpload(
    path: string,
    file: Express.Multer.File,
    body: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.aiCoreUrl}/${path}`;
    this.logger.log(`Forwarding file upload to ${url}`);

    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });

    if (body.num_questions) formData.append('num_questions', String(body.num_questions));
    if (body.difficulty) formData.append('difficulty', body.difficulty);

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
        }),
      );

      if (response.status >= 400) {
        throw new HttpException(response.data, response.status);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(`AI Core upload error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(`Error forwarding file upload to ${url}: ${error.message}`);
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
    const textFields = ['messages', 'institute_id', 'teacher_id', 'context', 'auth_token'];
    for (const field of textFields) {
      if (body[field] !== undefined) formData.append(field, String(body[field]));
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
            ...(headers?.authorization ? { authorization: headers.authorization } : {}),
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
        this.logger.error(`Teacher chat error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(`Error forwarding teacher chat to ${url}: ${error.message}`);
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
