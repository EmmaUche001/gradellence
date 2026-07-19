import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../database/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RateLimitGuard } from '../../common/throttler/throttler.guard';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION') || '15m',
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RateLimitGuard],
  exports: [AuthService],
})
export class AuthModule {}
