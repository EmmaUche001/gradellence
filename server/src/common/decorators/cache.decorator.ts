import { SetMetadata } from '@nestjs/common';

export interface CacheOptions {
  /** Time to live in seconds (default: 60) */
  ttl?: number;
  /**
   * Optional function to generate custom cache key
   * Receives (context: ExecutionContext) and should return string
   */
  keyGenerator?: (context: any) => string;
}

export const CACHE_KEY = 'cache_options';

/**
 * Cache decorator for NestJS controllers/methods.
 *
 * Usage:
 * ```ts
 * @Cache({ ttl: 30 }) // Cache for 30 seconds
 * @Get('students')
 * async findAll(...) { ... }
 *
 * @Cache({
 *   ttl: 60,
 *   keyGenerator: (context) => {
 *     const request = context.switchToHttp().getRequest();
 *     return `custom-key:${request.query.page}`;
 *   }
 * })
 * @Get('assessments')
 * async findAssessments(...) { ... }
 * ```
 */
export const Cache = (options: CacheOptions = {}) => SetMetadata(CACHE_KEY, options);
