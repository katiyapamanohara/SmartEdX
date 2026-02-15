import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import Redis from 'ioredis';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    const userId = request.user?.uid || 'public';
    const key = `cache:${userId}:${request.url}`;

    try {
      const cachedResponse = await this.redisClient.get(key);
      if (cachedResponse) {
        this.logger.log(`Returning cached response for ${key}`);
        return of(JSON.parse(cachedResponse));
      }
    } catch (error) {
      this.logger.error(`Redis get error: ${error.message}`);
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          // Default TTL: 60 seconds
          await this.redisClient.set(key, JSON.stringify(response), 'EX', 360);
          this.logger.log(`Cached response for ${key}`);
        } catch (error) {
          this.logger.error(`Redis set error: ${error.message}`);
        }
      }),
    );
  }
}
