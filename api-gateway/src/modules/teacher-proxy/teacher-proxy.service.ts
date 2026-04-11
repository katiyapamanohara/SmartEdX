import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TeacherProxyService {
  private readonly logger = new Logger(TeacherProxyService.name);
  private readonly teacherServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.teacherServiceUrl =
      this.configService.get<string>('TEACHER_SERVICE_URL') ||
      'http://localhost:5005';
  }

  async forwardRequest(
    path: string,
    method: string,
    body?: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.teacherServiceUrl}/api/${path}`;
    this.logger.log(`Forwarding ${method} request to: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data: body,
          headers: {
            ...this.filterHeaders(headers),
            'x-gateway-secret':
              this.configService.get<string>('GATEWAY_SECRET'),
          },
          validateStatus: (status) => status < 400,
        }),
      );

      this.logger.log(`Response status: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `Teacher service error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(`Error forwarding request to ${url}: ${error.message}`);
      throw error;
    }
  }

  private filterHeaders(headers: any): any {
    const allowedHeaders = [
      'authorization',
      'content-type',
      'x-requested-with',
      'accept',
      'user-agent',
    ];

    return Object.keys(headers).reduce((acc, key) => {
      if (allowedHeaders.includes(key.toLowerCase())) {
        acc[key] = headers[key];
      }
      return acc;
    }, {});
  }
}
