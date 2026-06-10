import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get school invoices' })
  getInvoices(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getInvoices(user.schoolId);
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get invoice details' })
  getInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getInvoice(id);
  }

  @Post('invoices')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Create a manual invoice' })
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Ensure schoolId matches current user's school
    dto.schoolId = user.schoolId;
    return this.billingService.createInvoice(dto);
  }

  @Post('invoices/:id/pay')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  payInvoice(
    @Param('id') id: string,
    @Body() { paymentRef, paymentMethod }: { paymentRef: string; paymentMethod: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.payInvoice(id, paymentRef, paymentMethod);
  }

  @Post('invoices/:id/fail')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Mark invoice as failed' })
  failInvoice(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.failInvoice(id);
  }
}