/**
 * Rate limit presets for different endpoint types.
 *
 * Usage with @RateLimit decorator:
 * ```ts
 * @RateLimit(RATE_LIMIT_PRESETS.AUTH_STRICT)
 * @Post('login')
 * ```
 */
export const RATE_LIMIT_PRESETS = {
  // Auth endpoints - strict
  AUTH_STRICT: { limit: 5, windowMs: 60_000 }, // 5 req/min
  AUTH_MODERATE: { limit: 10, windowMs: 60_000 }, // 10 req/min
  AUTH_PASSWORD: { limit: 3, windowMs: 60_000 }, // 3 req/min (forgot/reset)

  // Dashboard CRUD - moderate (authenticated, per-user)
  READ: { limit: 200, windowMs: 60_000 }, // 200 req/min
  WRITE: { limit: 50, windowMs: 60_000 }, // 50 req/min
  DELETE: { limit: 20, windowMs: 60_000 }, // 20 req/min

  // Heavy operations - strict
  BULK: { limit: 10, windowMs: 60_000 }, // 10 req/min
  COMPUTE: { limit: 5, windowMs: 60_000 }, // 5 req/min
  PUBLISH: { limit: 10, windowMs: 60_000 }, // 10 req/min
} as const;
