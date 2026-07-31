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
  UseInterceptors,
  UploadedFile,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
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
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';
import { ExportService } from '../../common/export/export.service';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class AssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Create a new assessment' })
  create(
    @Body() dto: CreateAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.assessmentsService.create(dto, user, req.ip, req.headers['user-agent']);
  }

  @Post('bulk')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @RateLimit(RATE_LIMIT_PRESETS.BULK)
  @ApiOperation({ summary: 'Create multiple assessments' })
  bulkCreate(@Body() dto: BulkAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.bulkCreate(dto, user);
  }

  @Get()
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get all assessments with pagination' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('studentId') studentId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('termId') termId?: string,
    @Query('type') type?: string,
  ) {
    return this.assessmentsService.findAll(user, page, limit, studentId, subjectId, termId, type);
  }

  // Static-segment routes must come before :id to avoid shadowing
  @Get('export')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @RateLimit(RATE_LIMIT_PRESETS.READ)
  @ApiOperation({ summary: 'Export assessments to CSV' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'termId', required: false })
  async exportAssessments(
    @Request() req: AuthenticatedRequest,
    @Query('classId') classId?: string,
    @Query('termId') termId?: string,
  ) {
    const data = await this.assessmentsService.export(req.user.schoolId, classId, termId);
    return this.exportService.toCsvStream(data, 'assessments');
  }

  @Get(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get assessment by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assessmentsService.findOne(id, user);
  }

  @Put(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Update an assessment' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.assessmentsService.update(id, dto, user, req.ip, req.headers['user-agent']);
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
  @ApiOperation({ summary: 'Delete an assessment' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.assessmentsService.remove(id, user, req.ip, req.headers['user-agent']);
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

  @Post('import')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @RateLimit(RATE_LIMIT_PRESETS.BULK)
  @UseInterceptors(FileInterceptor('csv'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import assessment scores from CSV' })
  @ApiResponse({ status: 200, description: 'Import result' })
  async importAssessments(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
  ) {
    if (!file?.buffer) {
      return { success: false, error: { message: 'No CSV file uploaded' } };
    }
    const csvContent = file.buffer.toString('utf-8');
    return this.assessmentsService.importCsv(req.user.schoolId, csvContent);
  }

  @Post(':id/publish')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Publish a single assessment (marks scores as final)' })
  @ApiResponse({ status: 200, description: 'Assessment published' })
  publishAssessment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    // Assessment scores are locked when results are computed and published via /results/publish
    // Individual assessment publish is not supported — redirect to broadsheet workflow
    return { success: false, message: 'Use the Broadsheet page to compute and publish results.' };
  }

}
