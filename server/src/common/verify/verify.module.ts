import { Module } from '@nestjs/common';
import { VerifyService } from './verify.service';
import { VerifyController } from './verify.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VerifyController],
  providers: [VerifyService],
  exports: [VerifyService],
})
export class VerifyModule {}
