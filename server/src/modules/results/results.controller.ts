import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  Res,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { PublishResultDto } from './dto/publish-result.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/express.types';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';
import { PdfService } from '../../common/pdf/pdf.service';
import { Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthenticatedRequest } from '../../common/types/express.types';

@ApiTags('Results')
@ApiBearerAuth()
@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly pdfService: PdfService,
    @InjectQueue('result-computation') private readonly resultQueue: Queue,
  ) {}

  @Post('compute/:classId/:termId')
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.COMPUTE)
  @ApiOperation({ summary: 'Compute results for a class in a term' })
  async compute(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @Body('subjectIds') subjectIds: string[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const job = await this.resultQueue.add('compute', {
      classId,
      termId,
      schoolId: user.schoolId,
      subjectIds,
      userId: user.id,
    });
    return { jobId: job.id };
  }

  @Get('compute-status/:jobId')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Get result computation job status' })
  async getComputeStatus(@Param('jobId') jobId: string, @CurrentUser() user: AuthenticatedUser) {
    const job = await this.resultQueue.getJob(jobId);
    if (!job || job.data.schoolId !== user.schoolId) {
      return { state: 'not_found' };
    }
    const state = await job.getState();
    return {
      state,
      result: state === 'completed' ? job.returnvalue : undefined,
      failedReason: state === 'failed' ? job.failedReason : undefined,
    };
  }

  @Post('publish')
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.PUBLISH)
  @ApiOperation({ summary: 'Publish results for a class and term' })
  publish(
    @Body() dto: PublishResultDto,
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.resultsService.publishResults(dto, user, req.ip, req.headers['user-agent']);
  }

  @Post('unpublish')
  @Roles('SCHOOL_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.PUBLISH)
  @ApiOperation({ summary: 'Unpublish results for a class and term' })
  unpublish(
    @Body() dto: PublishResultDto,
    @CurrentUser() user: AuthenticatedUser,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.resultsService.unpublishResults(dto, user, req.ip, req.headers['user-agent']);
  }

  @Get()
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get all results with pagination and filters' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('studentId') studentId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('termId') termId?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const publishedBool = isPublished !== undefined ? isPublished === 'true' : undefined;
    return this.resultsService.findAll(
      user,
      page,
      limit,
      studentId,
      subjectId,
      termId,
      publishedBool,
    );
  }

  @Get(':id')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get result by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.resultsService.findOne(id, user);
  }

  @Get('student/:studentId/:termId')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Get results for a specific student in a term' })
  getStudentResults(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resultsService.getStudentResults(studentId, termId, user);
  }

  @Get('me')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Get own results for a term (student only)' })
  getMyResults(@CurrentUser() user: AuthenticatedUser, @Query('termId') termId: string) {
    if (!user.studentId) {
      throw new ForbiddenException('Student record not linked to this user');
    }
    return this.resultsService.getStudentResults(user.studentId, termId, user, true);
  }

  @Get('me/report-card')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Generate own PDF report card (student only)' })
  async getMyReportCard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('termId') termId: string,
    @Res() res: Response,
  ) {
    if (!user.studentId) {
      throw new ForbiddenException('Student record not linked to this user');
    }
    const pdfBuffer = await this.pdfService.generateReportCard(
      user.studentId,
      termId,
      user.schoolId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${user.studentId}-${termId}.pdf"`,
    });

    res.send(pdfBuffer);
  }

  @Get('class/:classId/:termId')
  @Roles('SCHOOL_ADMIN', 'TEACHER')
  @ApiOperation({ summary: 'Get results for a class in a term' })
  getClassResults(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resultsService.getClassResults(classId, termId, user);
  }

  @Get('broadsheet/:classId/:termId')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Generate broadsheet for a class in a term' })
  getBroadsheet(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.resultsService.getBroadsheet(classId, termId, user);
  }

  @Get('report-card/:studentId/:termId')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Generate PDF report card for a student in a term' })
  async generateReportCard(
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generateReportCard(studentId, termId, user.schoolId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${studentId}-${termId}.pdf"`,
    });

    res.send(pdfBuffer);
  }

  @Get('broadsheet-pdf/:classId/:termId')
  @Roles('SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Generate PDF broadsheet for a class in a term' })
  async generateBroadsheetPdf(
    @Param('classId') classId: string,
    @Param('termId') termId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generateBroadsheet(classId, termId, user.schoolId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="broadsheet-${classId}-${termId}.pdf"`,
    });

    res.send(pdfBuffer);
  }

  @Get('academic-summary/:studentId')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Generate PDF academic summary for a student (all terms)' })
  async generateAcademicSummary(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generateAcademicSummary(studentId, user.schoolId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="academic-summary-${studentId}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  @Get('transcript/:studentId')
  @Roles('SCHOOL_ADMIN', 'TEACHER', 'PARENT')
  @ApiOperation({ summary: 'Generate PDF academic transcript for a student' })
  async generateTranscript(
    @Param('studentId') studentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.resultsService.getTranscriptData(studentId, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="transcript-${studentId}.pdf"`,
    });

    res.send(pdfBuffer);
  }
}
