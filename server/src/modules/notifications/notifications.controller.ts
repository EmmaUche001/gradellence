import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Record<string, boolean>,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }
}