import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ServiceHealth,
  ServiceStatus,
  CircuitBreakerState,
} from '../interfaces/service-health.interface';
import { ServiceConfig } from '../config/services.config';

@Injectable()
export class ServiceRegistryService {
  private readonly logger = new Logger(ServiceRegistryService.name);
  private readonly services = new Map<string, ServiceConfig>();
  private readonly clients = new Map<string, AxiosInstance>();
  private readonly healthCache = new Map<string, ServiceHealth>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  // Circuit breaker configuration
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_DURATION = 60000; // 1 minute
  private readonly HALF_OPEN_RETRIES = 3;

  constructor(private readonly configService: ConfigService) {
    this.initializeServices();
    this.startHealthCheckInterval();
  }

  private initializeServices(): void {
    const servicesConfig = this.configService.get('microservices.services');

    if (!servicesConfig) {
      this.logger.warn('No microservices configuration found');
      return;
    }

    Object.entries(servicesConfig).forEach(([key, config]) => {
      const serviceConfig = config as ServiceConfig;
      this.services.set(key, serviceConfig);

      // Initialize axios client for each service
      const client = axios.create({
        baseURL: serviceConfig.baseUrl,
        timeout: serviceConfig.timeout || 10000,
        headers: {
          'X-Gateway-Service': 'api-gateway',
        },
      });

      this.clients.set(key, client);

      // Initialize circuit breaker
      this.circuitBreakers.set(key, {
        failures: 0,
        state: 'CLOSED',
      });

      this.logger.log(
        `Registered service: ${serviceConfig.name} at ${serviceConfig.baseUrl}`,
      );
    });
  }

  getService(serviceName: string): ServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  getClient(serviceName: string): AxiosInstance | undefined {
    return this.clients.get(serviceName);
  }

  getAllServices(): Map<string, ServiceConfig> {
    return this.services;
  }

  getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return this.healthCache.get(serviceName);
  }

  getAllHealthStatuses(): ServiceHealth[] {
    return Array.from(this.healthCache.values());
  }

  private getCircuitBreaker(serviceName: string): CircuitBreakerState {
    return (
      this.circuitBreakers.get(serviceName) || {
        failures: 0,
        state: 'CLOSED',
      }
    );
  }

  isCircuitOpen(serviceName: string): boolean {
    const breaker = this.getCircuitBreaker(serviceName);
    return breaker.state === 'OPEN';
  }

  recordSuccess(serviceName: string): void {
    const breaker = this.getCircuitBreaker(serviceName);
    breaker.failures = 0;
    breaker.state = 'CLOSED';
    this.circuitBreakers.set(serviceName, breaker);
  }

  recordFailure(serviceName: string): void {
    const breaker = this.getCircuitBreaker(serviceName);
    breaker.failures += 1;
    breaker.lastFailure = new Date();

    if (breaker.failures >= this.FAILURE_THRESHOLD) {
      breaker.state = 'OPEN';
      this.logger.warn(
        `Circuit breaker opened for service: ${serviceName} after ${breaker.failures} failures`,
      );

      // Automatically attempt to close after timeout
      setTimeout(() => {
        this.attemptHalfOpen(serviceName);
      }, this.TIMEOUT_DURATION);
    }

    this.circuitBreakers.set(serviceName, breaker);
  }

  private attemptHalfOpen(serviceName: string): void {
    const breaker = this.getCircuitBreaker(serviceName);
    if (breaker.state === 'OPEN') {
      breaker.state = 'HALF_OPEN';
      this.circuitBreakers.set(serviceName, breaker);
      this.logger.log(`Circuit breaker half-open for service: ${serviceName}`);
    }
  }

  private async checkServiceHealth(
    serviceName: string,
    config: ServiceConfig,
  ): Promise<void> {
    const client = this.clients.get(serviceName);
    if (!client || !config.healthCheck) {
      return;
    }

    const startTime = Date.now();
    try {
      const response = await client.get(config.healthCheck, {
        timeout: 5000,
      });
      const responseTime = Date.now() - startTime;

      this.healthCache.set(serviceName, {
        name: config.name,
        status:
          response.status === 200 ? ServiceStatus.UP : ServiceStatus.DEGRADED,
        responseTime,
        lastChecked: new Date(),
      });

      this.recordSuccess(serviceName);
    } catch (error: any) {
      this.healthCache.set(serviceName, {
        name: config.name,
        status: ServiceStatus.DOWN,
        lastChecked: new Date(),
        error: error.message,
      });

      this.recordFailure(serviceName);
      this.logger.error(
        `Health check failed for ${config.name}: ${error.message}`,
      );
    }
  }

  private startHealthCheckInterval(): void {
    // Initial health check
    this.performHealthChecks();

    // Periodic health checks every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.services.entries()).map(
      ([serviceName, config]) => this.checkServiceHealth(serviceName, config),
    );

    await Promise.allSettled(promises);
  }
}
