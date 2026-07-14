import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check() {
    const results: Record<string, any> = {};

    // PostgreSQL check
    const pgStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      results.postgres = {
        status: 'up',
        responseTime: `${Date.now() - pgStart}ms`,
      };
    } catch (error) {
      results.postgres = {
        status: 'down',
        error: (error as Error).message,
      };
    }

    // Redis check
    const redisStart = Date.now();
    try {
      await this.redisService.getClient().ping();
      results.redis = {
        status: 'up',
        responseTime: `${Date.now() - redisStart}ms`,
      };
    } catch (error) {
      results.redis = {
        status: 'down',
        error: (error as Error).message,
      };
    }

    const allUp = Object.values(results).every((r: any) => r.status === 'up');
    const status = allUp ? 'ok' : 'degraded';

    return {
      status,
      info: results,
      error: {},
      details: results,
    };
  }
}