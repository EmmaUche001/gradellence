import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../../database/prisma.module';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PaystackGateway } from './paystack.gateway';
import { PaymentGateway, PAYMENT_GATEWAY } from './payment-gateway.interface';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    SubscriptionGuard,
    PaystackGateway,
    {
      provide: PAYMENT_GATEWAY,
      useClass: PaystackGateway,
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
