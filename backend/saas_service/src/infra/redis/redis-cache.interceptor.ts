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
import { SKIP_CACHE_KEY } from '../../core/decorators/skip-cache.decorator';

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
    const skipCache = this.reflector.getAllAndOverride<boolean>(SKIP_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCache) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const userId = request.user?.userId || 'public';

    // Invalidate cache for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(async () => {
          try {
            const pattern = `saas_users:${userId}:*`;
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

    const key = `saas_users:${userId}:${request.url}`;

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
