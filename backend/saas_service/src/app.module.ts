import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './core/health/health.controller';
import { DatabaseModule } from './infra/database/database.module';
import { FirebaseModule } from './infra/firebase/firebase.module';
import { MinioModule } from './infra/storage/minio.module';
import { RedisModule } from './infra/redis/redis.module';
import { RedisCacheInterceptor } from './infra/redis/redis-cache.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { PayhereModule } from './modules/payhere/payhere.module';
import { GatewayAuthGuard } from './core/guards/gateway-auth.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    FirebaseModule,
    MinioModule,
    RedisModule,
    AuthModule,
    PayhereModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: GatewayAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RedisCacheInterceptor,
    },
  ],
})
export class AppModule {}
