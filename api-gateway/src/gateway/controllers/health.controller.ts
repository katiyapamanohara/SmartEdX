import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ServiceRegistryService } from '../services/service-registry.service';
import { ServiceHealth } from '../interfaces/service-health.interface';
import { Public } from '../decorators/public.decorator';

@ApiTags('Gateway - Health & Monitoring')
@Controller('gateway')
@Public() // All health endpoints are public
export class HealthController {
  constructor(
    private readonly serviceRegistry: ServiceRegistryService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  getGatewayHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      gateway: 'api-gateway',
      version: '1.0.0',
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'List all registered microservices' })
  getRegisteredServices() {
    const services = Array.from(this.serviceRegistry.getAllServices().entries()).map(
      ([key, config]) => ({
        key,
        name: config.name,
        baseUrl: config.baseUrl,
        timeout: config.timeout,
      }),
    );

    return {
      count: services.length,
      services,
    };
  }

  @Get('services/health')
  @ApiOperation({ summary: 'Health status of all downstream services' })
  getServicesHealth() {
    const healthStatuses = this.serviceRegistry.getAllHealthStatuses();

    const summary = {
      total: healthStatuses.length,
      up: healthStatuses.filter((h) => h.status === 'UP').length,
      down: healthStatuses.filter((h) => h.status === 'DOWN').length,
      degraded: healthStatuses.filter((h) => h.status === 'DEGRADED').length,
      unknown: healthStatuses.filter((h) => h.status === 'UNKNOWN').length,
    };

    return {
      timestamp: new Date().toISOString(),
      summary,
      services: healthStatuses,
    };
  }
}
