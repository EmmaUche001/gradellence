import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEY, CacheOptions } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<CacheOptions>(CACHE_KEY, context.getHandler());

    // No cache decorator - pass through
    if (!options) {
      return next.handle();
    }

    // Only cache GET, HEAD, OPTIONS methods
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(context, options);
    const ttl = options.ttl ?? 60;

    // Try to get from cache, then proceed
    return from(this.redisService.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached !== null) {
          // Cache hit - return cached value
          const response = context.switchToHttp().getResponse();
          response.setHeader('X-Cache', 'HIT');
          try {
            const parsed = JSON.parse(cached);
            return of(parsed);
          } catch (e) {
            // If parsing fails, fall through to controller
          }
        }

        // Cache miss - proceed to controller
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-Cache', 'MISS');

        return next.handle().pipe(
          tap((responseData) => {
            // Only cache successful responses (2xx)
            if (response.statusCode >= 200 && response.statusCode < 300) {
              try {
                const json = JSON.stringify(responseData);
                this.redisService.set(cacheKey, json, ttl);
              } catch (e) {
                // Silently fail on cache write errors
              }
            }
          }),
        );
      }),
    );
  }

  private generateCacheKey(context: ExecutionContext, options: CacheOptions): string {
    const request = context.switchToHttp().getRequest();

    // Base key from method, path
    let key = `${request.method}:${request.path}`;

    // Add query parameters (sorted for consistent keys)
    const queryParams = Object.keys(request.query)
      .filter((k) => k !== undefined && k !== null)
      .sort()
      .reduce(
        (acc, k) => {
          acc[k] = request.query[k];
          return acc;
        },
        {} as Record<string, any>,
      );

    if (Object.keys(queryParams).length > 0) {
      key += `:${JSON.stringify(queryParams)}`;
    }

    // Add user ID for authenticated requests to prevent cross-user cache leakage
    const user = request.user;
    if (user && user.id) {
      key += `:user:${user.id}`;
    }

    // Add custom key generator if provided
    if (options.keyGenerator) {
      try {
        const customKey = options.keyGenerator(context);
        if (customKey) {
          key += `:${customKey}`;
        }
      } catch (e) {
        // If key generator fails, continue with base key
      }
    }

    return `srms:cache:${key}`;
  }
}
