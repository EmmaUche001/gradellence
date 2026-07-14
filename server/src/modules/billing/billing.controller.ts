import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PaystackWebhookGuard } from './guards/paystack-webhook.guard';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(SubscriptionGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get school invoices' })
  getInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getInvoices(user.schoolId);
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get invoice details' })
  getInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getInvoice(id, user.schoolId);
  }

  @Post('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.PUBLISH)
  @RequiresFeature('BILLING') // TODO: confirm which plan tier this requires
  @ApiOperation({ summary: 'Create a manual invoice' })
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    // Ensure schoolId matches current user's school
    dto.schoolId = user.schoolId;
    return this.billingService.createInvoice(dto);
  }

  @Get('config/public-key')
  @ApiExcludeEndpoint()
  getPublicKey() {
    return { publicKey: this.billingService.getGatewayPublicKey() };
  }

  @Post('invoices/:id/pay')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.PUBLISH)
  @ApiOperation({ summary: 'Initialize payment for invoice' })
  payInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.payInvoice(id, user.schoolId);
  }

  @Post('invoices/:id/fail')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.PUBLISH)
  @ApiOperation({ summary: 'Mark invoice as failed' })
  failInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billingService.failInvoice(id, user.schoolId);
  }

  @Post('webhook/paystack')
  @UseGuards(PaystackWebhookGuard)
  @ApiOperation({ summary: 'Paystack webhook endpoint (public)' })
  handlePaystackWebhook(@Body() body: any) {
    if (body.event === 'charge.success' && body.data?.reference) {
      return this.billingService.confirmPayment(body.data.reference);
    }
    return { received: true };
  }
}
