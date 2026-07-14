import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
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

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  findAllPlans() {
    return this.subscriptionsService.findAllPlans();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a single subscription plan' })
  findOnePlan(@Param('id') id: string) {
    return this.subscriptionsService.findOnePlan(id);
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('SUPER_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @RequiresFeature('SUBSCRIPTIONS') // TODO: confirm which plan tier this requires
  @ApiOperation({ summary: 'Create a new subscription plan (Super Admin)' })
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Post('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('SUPER_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @RequiresFeature('SUBSCRIPTIONS') // TODO: confirm which plan tier this requires
  @ApiOperation({ summary: 'Update a subscription plan (Super Admin)' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @Roles('SUPER_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
  @RequiresFeature('SUBSCRIPTIONS') // TODO: confirm which plan tier this requires
  @ApiOperation({ summary: 'Deactivate a subscription plan (Super Admin)' })
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }

  @Post('subscribe/:planId')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.PUBLISH)
  @RequiresFeature('SUBSCRIPTIONS') // TODO: confirm which plan tier this requires
  @ApiOperation({ summary: 'Subscribe to a plan' })
  subscribe(@Param('planId') planId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.subscribe(user.schoolId, planId);
  }

  @Get('my-plan')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get current school subscription' })
  getMyPlan(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getCurrentSubscription(user.schoolId);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard, SubscriptionGuard)
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.PUBLISH)
  @RequiresFeature('SUBSCRIPTIONS') // TODO: confirm which plan tier this requires
  @ApiOperation({ summary: 'Cancel current subscription' })
  cancel(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancelSubscription(user.schoolId);
  }

  @Post('seed-defaults')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Create default subscription plans (Super Admin)' })
  @ApiResponse({ status: 200, description: 'Default plans created or already exist' })
  seedDefaultPlans() {
    return this.subscriptionsService.seedDefaultPlans();
  }
}
