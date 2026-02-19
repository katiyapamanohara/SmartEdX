import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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
    const url = `${this.instituteServiceUrl}/api/${path}`;
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
