import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from '../../common/health/health.service';
import { PrismaModule } from '../../database/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
