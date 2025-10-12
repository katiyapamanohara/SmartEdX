import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { Request } from 'express';
import { ServiceRegistryService } from './service-registry.service';

export interface ProxyResponse {
  status: number;
  data: any;
  headers: any;
  serviceName: string;
  responseTime: number;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly serviceRegistry: ServiceRegistryService,
  ) {}

  async forwardToService(
    serviceName: string,
    req: Request,
  ): Promise<ProxyResponse> {
    // Check if service exists
    const service = this.serviceRegistry.getService(serviceName);
    if (!service) {
      throw new HttpException(
        {
          message: `Service '${serviceName}' not found`,
          availableServices: Array.from(
            this.serviceRegistry.getAllServices().keys(),
          ),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Check circuit breaker
    if (this.serviceRegistry.isCircuitOpen(serviceName)) {
      throw new HttpException(
        {
          message: `Service '${serviceName}' is temporarily unavailable (circuit breaker open)`,
          service: service.name,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const client = this.serviceRegistry.getClient(serviceName);
    if (!client) {
      throw new HttpException(
        `Client not initialized for service '${serviceName}'`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const startTime = Date.now();

    try {
      const url = this.buildTargetUrl(req, serviceName);
      const method = (req.method || 'GET').toLowerCase() as AxiosRequestConfig['method'];

      // Clone headers and strip hop-by-hop headers
      const headers: Record<string, any> = { ...req.headers };
      delete headers['host'];
      delete headers['connection'];
      delete headers['content-length'];
      delete headers['transfer-encoding'];

      // Add correlation ID for distributed tracing
      headers['X-Correlation-ID'] = 
        req.headers['x-correlation-id'] || this.generateCorrelationId();
      headers['X-Forwarded-For'] = req.ip;
      headers['X-Forwarded-Host'] = req.hostname;
      
      // Forward user information from JWT auth
      const user = (req as any).user;
      if (user) {
        headers['X-User-ID'] = user.id?.toString() || '';
        headers['X-User-Email'] = user.email || '';
        headers['X-User-Role'] = user.role?.id?.toString() || '';
        headers['X-User-Name'] = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }

      const config: AxiosRequestConfig = {
        url,
        method,
        headers,
        data: ['post', 'put', 'patch', 'delete'].includes(method ?? '')
          ? req.body
          : undefined,
        timeout: service.timeout || 10000,
        validateStatus: () => true, // Don't throw on any status
      };

      this.logger.log(
        `Forwarding ${method?.toUpperCase()} request to ${service.name}: ${url}`,
      );

      const response = await client.request(config);
      const responseTime = Date.now() - startTime;

      // Record success for circuit breaker
      this.serviceRegistry.recordSuccess(serviceName);

      this.logger.log(
        `Response from ${service.name}: ${response.status} (${responseTime}ms)`,
      );

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        serviceName: service.name,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Record failure for circuit breaker
      this.serviceRegistry.recordFailure(serviceName);

      this.logger.error(
        `Error forwarding to ${service.name}: ${error.message} (${responseTime}ms)`,
      );

      // Handle different error types
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          {
            message: `Service '${serviceName}' is not reachable`,
            service: service.name,
            error: 'Connection refused',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        throw new HttpException(
          {
            message: `Service '${serviceName}' request timed out`,
            service: service.name,
            timeout: service.timeout,
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      throw new HttpException(
        {
          message: `Error communicating with service '${serviceName}'`,
          service: service.name,
          error: error.message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private buildTargetUrl(req: Request, serviceName: string): string {
    // Remove the service prefix from the URL
    // e.g., /quiz/questions -> /questions
    const originalUrl = req.originalUrl || req.url;
    const regex = new RegExp(`^\/?${serviceName}\/?`);
    const path = originalUrl.replace(regex, '');
    return path.startsWith('/') ? path : `/${path}`;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
