import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { BulkAssessmentDto } from './dto/bulk-assessment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Create a new assessment' })
  create(@Body() dto: CreateAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.create(dto, user);
  }

  @Post('bulk')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Create multiple assessments' })
  bulkCreate(@Body() dto: BulkAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.bulkCreate(dto, user);
  }

  @Get()
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get all assessments with pagination' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('studentId') studentId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('termId') termId?: string,
    @Query('type') type?: string,
  ) {
    return this.assessmentsService.findAll(user, page, limit, studentId, subjectId, termId, type);
  }

  @Get(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get assessment by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Update an assessment' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Delete an assessment' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.remove(id, user);
  }

  @Get('student/:studentId/subject/:subjectId/term/:termId')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get assessments for a student in a subject and term' })
  getStudentAssessments(
    @Param('studentId') studentId: string,
    @Param('subjectId') subjectId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.getStudentAssessments(studentId, subjectId, termId, user);
  }

  @Get('class/:classId/subject/:subjectId/term/:termId/type/:type')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get assessments for a class in a subject, term, and type' })
  getClassAssessments(
    @Param('classId') classId: string,
    @Param('subjectId') subjectId: string,
    @Param('termId') termId: string,
    @Param('type') type: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assessmentsService.getClassAssessments(classId, subjectId, termId, type, user);
  }
}