import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { TermSchedulerService } from './term-scheduler.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SessionsController],
  providers: [SessionsService, TermSchedulerService],
  exports: [SessionsService],
})
export class SessionsModule {}
