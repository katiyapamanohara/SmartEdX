import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

@Injectable()
export class InstituteProxyService {
  private readonly logger = new Logger(InstituteProxyService.name);
  private readonly instituteServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.instituteServiceUrl =
      this.configService.get<string>('INSTITUTE_SERVICE_URL') ||
      'http://localhost:5003';
  }

  async forwardRequest(
    path: string,
    method: string,
    body?: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.instituteServiceUrl}/api/institutes/${path}`;
    this.logger.log(`Forwarding ${method} request to: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          data: body,
          headers: {
            ...this.filterHeaders(headers),
            'x-gateway-secret': this.configService.get<string>('GATEWAY_SECRET'),
          },
          validateStatus: (status) => status < 400,
        }),
      );

      this.logger.log(`Response status: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        this.logger.error(
          `Institute service error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(
        `Error forwarding request to ${url}: ${error.message}`,
      );
      throw error;
    }
  }

  async forwardFileUpload(
    path: string,
    file: Express.Multer.File,
    body: any,
    headers?: any,
  ): Promise<any> {
    const url = `${this.instituteServiceUrl}/api/institutes/${path}`;
    this.logger.log(`Forwarding file upload to: ${url}`);

    const formData = new FormData();
    if (file) {
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.size,
      });
    }

    // Forward any extra text fields (title, type, description, order)
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
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
            'x-gateway-secret': this.configService.get<string>('GATEWAY_SECRET'),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          validateStatus: (status) => status < 500,
        }),
      );

      if (response.status >= 400) {
        throw new HttpException(response.data, response.status);
      }

      this.logger.log(`File upload response status: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (error.response) {
        this.logger.error(
          `Institute service file upload error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
        throw new HttpException(error.response.data, error.response.status);
      }
      this.logger.error(`Error forwarding file upload to ${url}: ${error.message}`);
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
