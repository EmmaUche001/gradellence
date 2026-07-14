import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    @InjectQueue('bulk-enrollment') private readonly bulkEnrollmentQueue: Queue,
  ) {}

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Enroll a student in a class' })
  @ApiResponse({ status: 201, description: 'Student enrolled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Student, class, or term not found' })
  @ApiResponse({ status: 409, description: 'Student already enrolled' })
  async create(@Body() dto: CreateEnrollmentDto, @Request() req: AuthenticatedRequest) {
    return this.enrollmentsService.create(dto, req.user);
  }

  @Post('bulk')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.BULK)
  @ApiOperation({ summary: 'Bulk enroll students in a class' })
  @ApiResponse({ status: 201, description: 'Bulk enrollment completed' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Class or term not found' })
  async bulkCreate(@Body() dto: BulkEnrollmentDto, @Request() req: AuthenticatedRequest) {
    const job = await this.bulkEnrollmentQueue.add('bulk-create', {
      classId: dto.classId,
      termId: dto.termId,
      schoolId: req.user.schoolId,
      studentIds: dto.studentIds,
      userId: req.user.id,
    });
    return { jobId: job.id };
  }

  @Get('bulk-status/:jobId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get bulk enrollment job status' })
  async getBulkEnrollmentStatus(
    @Param('jobId') jobId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const job = await this.bulkEnrollmentQueue.getJob(jobId);
    if (!job || job.data.schoolId !== req.user.schoolId) {
      return { state: 'not_found' };
    }
    const state = await job.getState();
    return {
      state,
      result: state === 'completed' ? job.returnvalue : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all enrollments' })
  @ApiResponse({ status: 200, description: 'Enrollments retrieved successfully' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('classId') classId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.enrollmentsService.findAll(req.user, page, limit, classId, termId);
  }

  @Get('classes/:classId/terms/:termId')
  @ApiOperation({ summary: 'Get enrollments for a class and term' })
  @ApiResponse({ status: 200, description: 'Class enrollments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async getClassEnrollments(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.enrollmentsService.getClassEnrollments(classId, termId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({ status: 200, description: 'Enrollment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.enrollmentsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Update enrollment' })
  @ApiResponse({ status: 200, description: 'Enrollment updated successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.enrollmentsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
  @ApiOperation({ summary: 'Remove enrollment' })
  @ApiResponse({ status: 200, description: 'Enrollment removed successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.enrollmentsService.remove(id, req.user);
  }
}
