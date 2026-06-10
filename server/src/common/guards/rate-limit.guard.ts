import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No rate limit configured — allow through
    if (!options) {
      return true;
    }

    // Graceful degradation: if Redis unavailable, allow the request
    if (!this.redisService.isReady()) {
      this.logger.warn('Redis unavailable — skipping rate limit check');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Identifier = IP address (or X-Forwarded-For in production behind proxy)
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || request.ip
      || request.socket?.remoteAddress
      || 'unknown';

    const routeKey = `${request.method}:${request.route?.path || request.url}`;

    const windowSec = Math.ceil(options.windowMs / 1000);

    try {
      const currentCount = await this.redisService.incrementRateLimit(
        ip,
        routeKey,
        windowSec,
      );

      // Set standard rate-limit headers
      response.setHeader('X-RateLimit-Limit', options.limit);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, options.limit - currentCount));

      if (currentCount > options.limit) {
        response.setHeader('Retry-After', windowSec);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Unexpected error — log and allow through
      this.logger.error('Rate limit check failed', error);
      return true;
    }
  }
}