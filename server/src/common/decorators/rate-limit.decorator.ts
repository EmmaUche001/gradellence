import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the time window. */
  limit: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

export const RATE_LIMIT_KEY = 'rate_limit_options';

/**
 * Rate limit decorator for NestJS controllers/methods.
 *
 * Usage:
 * ```ts
 * @RateLimit({ limit: 5, windowMs: 60_000 })
 * @Post('login')
 * async login(...) { ... }
 * ```
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);