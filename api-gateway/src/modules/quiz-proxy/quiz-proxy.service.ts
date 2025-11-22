import { Injectable } from '@nestjs/common';
import { HttpService } from '../../infra/http/http.service';
import { servicesConfig } from '../../infra/config/services.config';

@Injectable()
export class QuizProxyService {
  private readonly serviceUrl = servicesConfig.quizService.url;

  constructor(private readonly httpService: HttpService) {}

  async proxyRequest(
    method: string,
    path: string,
    options: {
      query?: any;
      body?: any;
      headers?: any;
      user?: any;
    } = {},
  ) {
    const url = `${this.serviceUrl}${servicesConfig.quizService.prefix}${path}`;
    const config = {
      params: options.query,
      headers: this.prepareHeaders(options.headers, options.user),
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

  private prepareHeaders(headers: any, user?: any): any {
    const sanitized: any = {};

    // Forward Authorization header (JWT token)
    if (headers?.authorization) {
      sanitized['authorization'] = headers.authorization;
    }

    // Add user context as custom headers for microservices
    if (user) {
      sanitized['x-user-id'] = user.userId || user.id;
      sanitized['x-user-email'] = user.email;
      sanitized['x-user-role'] = user.role;
    }

    // Forward other important headers
    if (headers?.['content-type']) {
      sanitized['content-type'] = headers['content-type'];
    }
    if (headers?.['accept']) {
      sanitized['accept'] = headers['accept'];
    }

    return sanitized;
  }
}
