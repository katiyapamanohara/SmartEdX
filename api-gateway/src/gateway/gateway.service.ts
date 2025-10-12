import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Request } from 'express';

@Injectable()
export class GatewayService {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('QUIZ_SERVICE_URL') ||
      process.env.QUIZ_SERVICE_URL ||
      'http://localhost:4001';
  }

  async forward(req: Request): Promise<
    Pick<AxiosResponse, 'status' | 'data' | 'headers'>
  > {
    const url = this.buildTargetUrl(req);
    const method = (req.method || 'GET').toLowerCase() as AxiosRequestConfig['method'];

    // Clone headers and strip hop-by-hop headers
    const headers: Record<string, any> = { ...req.headers };
    delete headers['host'];
    delete headers['connection'];
    delete headers['content-length'];
    delete headers['transfer-encoding'];

    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      // Forward request body for methods that can have a body
     data: ['post', 'put', 'patch', 'delete'].includes(method ?? '')

        ? req.body
        : undefined,
      // Accept reasonable timeouts
      timeout: 10000,
      // Preserve query handled in url
      validateStatus: () => true,
    };

    const response = await axios.request(config);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  }

  private buildTargetUrl(req: Request): string {
    // Remove the leading `/quiz` from original URL
    const originalUrl = req.originalUrl || req.url;
    const path = originalUrl.replace(/^\/?quiz\/?/, '');
    const sep = this.baseUrl.endsWith('/') ? '' : '/';
    return `${this.baseUrl}${sep}${path}`;
  }
}
