import { ThrottlerModule } from '@nestjs/throttler';

export const throttlerOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60_000, // 1 minute
      limit: 100, // 100 requests per minute
    },
  ],
};

export const AUTH_THROTTLE = {
  ttl: 60_000,
  limit: 5, // 5 requests per minute for auth endpoints
};

export const BILLING_THROTTLE = {
  ttl: 60_000,
  limit: 50, // 50 requests per minute for billing webhooks
};
