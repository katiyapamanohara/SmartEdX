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
    const userId = request.user?.userId || 'public';

    // Invalidate cache for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(async () => {
          try {
            // Pattern to match all institute contexts for this user
            const pattern = `Institute_users:*:${userId}:*`;
            const stream = this.redisClient.scanStream({
              match: pattern,
            });

            stream.on('data', async (keys: string[]) => {
              if (keys.length > 0) {
                await this.redisClient.del(...keys);
                this.logger.log(
                  `Invalidated cache for keys: ${keys.join(', ')}`,
                );
              }
            });

            stream.on('end', () => {
              this.logger.log(
                `Cache invalidation complete for pattern: ${pattern}`,
              );
            });
          } catch (error) {
            this.logger.error(`Redis invalidation error: ${error.message}`);
          }
        }),
      );
    }

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    const instituteId = request.user?.instituteId;
    const role = request.user?.role;

    this.logger.debug(
      `Cache Interceptor: instituteId=${instituteId}, userId=${userId}, role=${role}, url=${request.url}`,
    );

    if (!instituteId) {
      return next.handle();
    }
    const key = `Institute_users:${instituteId}:${userId}:${role}:${request.url}`;

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
