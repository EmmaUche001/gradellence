/**
 * Redis key prefixes and TTL constants for the SRMS application.
 * All keys are namespaced with 'srms:' for isolation.
 */

export const REDIS_KEY_PREFIX = 'srms';

export const REDIS_KEYS = {
  // Auth tokens
  REFRESH_TOKEN: (userId: string) => `${REDIS_KEY_PREFIX}:auth:refresh:${userId}`,
  ACCESS_TOKEN_BLACKLIST: (tokenId: string) => `${REDIS_KEY_PREFIX}:auth:blacklist:${tokenId}`,

  // Rate limiting
  RATE_LIMIT: (identifier: string, route: string) =>
    `${REDIS_KEY_PREFIX}:ratelimit:${route}:${identifier}`,

  // Caching
  CACHE: (schoolId: string, feature: string, key: string) =>
    `${REDIS_KEY_PREFIX}:cache:${schoolId}:${feature}:${key}`,

  // Sessions (for WebSocket or future use)
  SESSION: (sessionId: string) => `${REDIS_KEY_PREFIX}:session:${sessionId}`,

  // School-level locks (for distributed operations)
  LOCK: (schoolId: string, resource: string) => `${REDIS_KEY_PREFIX}:lock:${schoolId}:${resource}`,
} as const;

export const REDIS_TTL = {
  // Token TTLs (match JWT config)
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days in seconds
  ACCESS_TOKEN_BLACKLIST: 15 * 60, // 15 minutes (access token expiry)

  // Rate limiting
  RATE_LIMIT_WINDOW: 60, // 1 minute window

  // Cache TTLs
  CACHE_SHORT: 60, // 1 minute
  CACHE_MEDIUM: 5 * 60, // 5 minutes
  CACHE_LONG: 60 * 60, // 1 hour

  // Lock TTL
  LOCK: 30, // 30 seconds
} as const;
