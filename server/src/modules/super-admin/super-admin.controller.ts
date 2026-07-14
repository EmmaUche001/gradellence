import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';

@ApiTags('Super Admin')
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLES.SUPER_ADMIN)
@ApiBearerAuth()
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // ── Schools Management ──────────────────────────────

  @Get('schools')
  @ApiOperation({ summary: 'Get all schools (Super Admin)' })
  @ApiBearerAuth()
  async findAllSchools(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.superAdminService.findAllSchools(page, limit, search, status);
  }

  @Get('schools/:id')
  @ApiOperation({ summary: 'Get school by ID (Super Admin)' })
  async findSchoolById(@Param('id') id: string) {
    return this.superAdminService.findSchoolById(id);
  }

  @Post('schools/:id/suspend')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Suspend a school (Super Admin)' })
  async suspendSchool(@Param('id') id: string) {
    return this.superAdminService.suspendSchool(id);
  }

  @Post('schools/:id/reactivate')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Reactivate a suspended school (Super Admin)' })
  async reactivateSchool(@Param('id') id: string) {
    return this.superAdminService.reactivateSchool(id);
  }

  @Delete('schools/:id')
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
  @ApiOperation({ summary: 'Soft delete a school (Super Admin)' })
  async deleteSchool(@Param('id') id: string) {
    return this.superAdminService.deleteSchool(id);
  }

  // ── Platform Analytics ──────────────────────────────

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get platform-wide analytics overview (Super Admin)' })
  async getPlatformStats() {
    return this.superAdminService.getPlatformStats();
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue stats (Super Admin)' })
  async getRevenueStats(@Query('period') period: string = '30d') {
    return this.superAdminService.getRevenueStats(period);
  }
}