import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../database/prisma.module';
import { BullMQModule } from '../../common/jobs/bullmq.module';

@Module({
  imports: [PrismaModule, BullMQModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}