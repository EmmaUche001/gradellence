import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { RedisService } from './redis.service';
import { REDIS_KEY_PREFIX } from './redis.constants';

export interface RedisModuleOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  ttl?: number;
  max?: number;
  isGlobal?: boolean;
}

@Global()
@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'REDIS_OPTIONS',
        useValue: options,
      },
      RedisService,
    ];

    return {
      module: RedisModule,
      providers,
      exports: [RedisService],
      global: options.isGlobal ?? true,
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<RedisModuleOptions> | RedisModuleOptions;
    inject?: any[];
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'REDIS_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject || [ConfigService],
      },
      RedisService,
    ];

    return {
      module: RedisModule,
      imports: options.imports || [ConfigModule],
      providers,
      exports: [RedisService],
      global: true,
    };
  }

  /**
   * Cache module with Redis store for HTTP caching via @UseInterceptors(CacheInterceptor)
   * Usage: CacheModule.registerAsync({ ... })
   */
  static registerCache(options: RedisModuleOptions = {}): DynamicModule {
    return CacheModule.registerAsync({
      imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          store: await redisStore({
            host: configService.get<string>('REDIS_HOST') ?? options.host ?? 'localhost',
            port: configService.get<number>('REDIS_PORT') ?? options.port ?? 6379,
            password: configService.get<string>('REDIS_PASSWORD') ?? options.password,
            db: configService.get<number>('REDIS_DB') ?? options.db ?? 0,
            ttl: options.ttl || 60,
            max: options.max || 100,
          }),
          isGlobal: true,
        }),
      inject: [ConfigService],
    });
  }
}