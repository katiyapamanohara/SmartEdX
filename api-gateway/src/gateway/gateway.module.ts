import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GatewayService } from './services/gateway.service';
import { ServiceRegistryService } from './services/service-registry.service';
import { GatewayController } from './controllers/gateway.controller';
import { HealthController } from './controllers/health.controller';
import servicesConfig from './config/services.config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule.forFeature(servicesConfig),
    HttpModule.register({ timeout: 10000 }),
    AuthModule, // Import auth module for JWT validation
  ],
  controllers: [GatewayController, HealthController],
  providers: [
    GatewayService,
    ServiceRegistryService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [ServiceRegistryService, GatewayService],
})
export class GatewayModule {}

