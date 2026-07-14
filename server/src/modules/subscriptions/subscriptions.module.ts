import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaModule } from '../../database/prisma.module';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
