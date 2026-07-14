import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REDIS_KEYS, REDIS_TTL } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = this.configService.get<number>('REDIS_DB', 0);

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.warn('Redis max retries reached, stopping retry');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error('Redis error', err);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      // Don't throw - allow app to start without Redis (graceful degradation)
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.logger.log('Redis disconnected');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  // ==================== Auth Token Methods ====================

  async storeRefreshToken(userId: string, token: string): Promise<void> {
    if (!this.isReady()) return;
    const key = REDIS_KEYS.REFRESH_TOKEN(userId);
    await this.client.set(key, token, 'EX', REDIS_TTL.REFRESH_TOKEN);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    if (!this.isReady()) return null;
    const key = REDIS_KEYS.REFRESH_TOKEN(userId);
    return this.client.get(key);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    if (!this.isReady()) return;
    const key = REDIS_KEYS.REFRESH_TOKEN(userId);
    await this.client.del(key);
  }

  async blacklistAccessToken(tokenId: string): Promise<void> {
    if (!this.isReady()) return;
    const key = REDIS_KEYS.ACCESS_TOKEN_BLACKLIST(tokenId);
    await this.client.set(key, '1', 'EX', REDIS_TTL.ACCESS_TOKEN_BLACKLIST);
  }

  async isAccessTokenBlacklisted(tokenId: string): Promise<boolean> {
    if (!this.isReady()) return false;
    const key = REDIS_KEYS.ACCESS_TOKEN_BLACKLIST(tokenId);
    const result = await this.client.get(key);
    return result === '1';
  }

  // ==================== Password Reset ====================

  async storePasswordResetToken(token: string, userId: string): Promise<void> {
    if (!this.isReady()) return;
    const key = REDIS_KEYS.PASSWORD_RESET(token);
    await this.client.set(key, userId, 'EX', REDIS_TTL.PASSWORD_RESET);
  }

  async getPasswordResetToken(token: string): Promise<string | null> {
    if (!this.isReady()) return null;
    const key = REDIS_KEYS.PASSWORD_RESET(token);
    return this.client.get(key);
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    if (!this.isReady()) return;
    const key = REDIS_KEYS.PASSWORD_RESET(token);
    await this.client.del(key);
  }

  // ==================== Rate Limiting ====================

  async incrementRateLimit(
    identifier: string,
    route: string,
    windowSec: number = REDIS_TTL.RATE_LIMIT_WINDOW,
  ): Promise<number> {
    if (!this.isReady()) return 0;
    const key = REDIS_KEYS.RATE_LIMIT(identifier, route);
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, windowSec);
    }
    return count;
  }

  async getRateLimit(identifier: string, route: string): Promise<number> {
    if (!this.isReady()) return 0;
    const key = REDIS_KEYS.RATE_LIMIT(identifier, route);
    const count = await this.client.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async resetRateLimit(identifier: string, route: string): Promise<void> {
    if (!this.isReady()) return;
    const key = REDIS_KEYS.RATE_LIMIT(identifier, route);
    await this.client.del(key);
  }

  // ==================== Caching ====================

  async setCache<T>(
    schoolId: string,
    feature: string,
    key: string,
    value: T,
    ttl: number = REDIS_TTL.CACHE_MEDIUM,
  ): Promise<void> {
    if (!this.isReady()) return;
    const redisKey = REDIS_KEYS.CACHE(schoolId, feature, key);
    await this.client.set(redisKey, JSON.stringify(value), 'EX', ttl);
  }

  async getCache<T>(schoolId: string, feature: string, key: string): Promise<T | null> {
    if (!this.isReady()) return null;
    const redisKey = REDIS_KEYS.CACHE(schoolId, feature, key);
    const data = await this.client.get(redisKey);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(schoolId: string, feature: string, key: string): Promise<void> {
    if (!this.isReady()) return;
    const redisKey = REDIS_KEYS.CACHE(schoolId, feature, key);
    await this.client.del(redisKey);
  }

  async deleteCachePattern(schoolId: string, feature: string, pattern: string): Promise<void> {
    if (!this.isReady()) return;
    const prefix = REDIS_KEYS.CACHE(schoolId, feature, '');
    const keys = await this.client.keys(`${prefix}${pattern}*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // ==================== Distributed Locks ====================

  async acquireLock(
    schoolId: string,
    resource: string,
    ttl: number = REDIS_TTL.LOCK,
  ): Promise<boolean> {
    if (!this.isReady()) return false;
    const key = REDIS_KEYS.LOCK(schoolId, resource);
    const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async releaseLock(schoolId: string, resource: string): Promise<void> {
    if (!this.isReady()) return;
    const key = REDIS_KEYS.LOCK(schoolId, resource);
    await this.client.del(key);
  }

  // ==================== Generic Operations ====================

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isReady()) return;
    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady()) return null;
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    const result = await this.client.exists(key);
    return result === 1;
  }
}
