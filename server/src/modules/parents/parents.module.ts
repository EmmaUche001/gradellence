import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { ParentJwtStrategy } from './strategies/parent-jwt.strategy';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION') || '15m',
        },
      }),
    }),
  ],
  controllers: [ParentsController],
  providers: [ParentsService, ParentJwtStrategy],
  exports: [ParentsService],
})
export class ParentsModule {}