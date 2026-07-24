import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';
import { RequiresFeature } from '../../common/decorators/requires-feature.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get school overview stats' })
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.analyticsService.getOverview(user.schoolId);
  }

  @Get('results')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)
  @RequiresFeature('ANALYTICS')
  @ApiOperation({ summary: 'Get result statistics' })
  getResultStats(@CurrentUser() user: AuthenticatedUser, @Query('termId') termId?: string) {
    return this.analyticsService.getResultStats(user.schoolId, termId);
  }

  @Get('class-rankings/:classId')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)
  @RequiresFeature('ANALYTICS')
  @ApiOperation({ summary: 'Get top 10 students by average score in a class' })
  getClassRankings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Query('termId') termId: string,
  ) {
    return this.analyticsService.getClassRankings(user.schoolId, classId, termId);
  }

  @Get('enrollment-history')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get enrollment counts grouped by time period for the trend chart' })
  getEnrollmentHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period: '7d' | '30d' | '90d' | '1y' = '30d',
  ) {
    return this.analyticsService.getEnrollmentHistory(user.schoolId, period);
  }

  @Get('grade-distribution')
  @Roles(ROLES.SCHOOL_ADMIN, ROLES.TEACHER)
  @ApiOperation({ summary: 'Get grade band distribution for the donut chart' })
  getGradeDistribution(@CurrentUser() user: AuthenticatedUser, @Query('termId') termId?: string) {
    return this.analyticsService.getGradeDistribution(user.schoolId, termId);
  }
}
