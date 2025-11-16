import { Injectable } from '@nestjs/common';
import { HttpService } from '../../infra/http/http.service';
import { servicesConfig } from '../../infra/config/services.config';

@Injectable()
export class UserProxyService {
  private readonly serviceUrl = servicesConfig.userService.url;

  constructor(private readonly httpService: HttpService) {}

  async proxyRequest(
    method: string,
    path: string,
    options: {
      query?: any;
      body?: any;
      headers?: any;
    } = {},
  ) {
    const url = `${this.serviceUrl}${servicesConfig.userService.prefix}${path}`;
    const config = {
      params: options.query,
      headers: this.sanitizeHeaders(options.headers),
    };

    switch (method.toUpperCase()) {
      case 'GET':
        return (await this.httpService.get(url, config)).data;
      case 'POST':
        return (await this.httpService.post(url, options.body, config)).data;
      case 'PUT':
        return (await this.httpService.put(url, options.body, config)).data;
      case 'PATCH':
        return (await this.httpService.patch(url, options.body, config)).data;
      case 'DELETE':
        return (await this.httpService.delete(url, config)).data;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return {};
    const sanitized = { ...headers };
    delete sanitized['host'];
    delete sanitized['content-length'];
    return sanitized;
  }
}
