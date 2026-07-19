import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { ParentRegisterDto } from './dto/parent-register.dto';
import { ParentLoginDto } from './dto/parent-login.dto';
import { JwtParentAuthGuard } from '../../common/guards/jwt-parent-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PdfService } from '../../common/pdf/pdf.service';
import { Response } from 'express';

@ApiTags('Parents')
@Controller('parents')
export class ParentsController {
  constructor(
    private readonly parentsService: ParentsService,
    private readonly pdfService: PdfService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as a parent' })
  register(@Body() dto: ParentRegisterDto) {
    return this.parentsService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parent login' })
  login(@Body() dto: ParentLoginDto) {
    return this.parentsService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh parent access token' })
  refresh(@Body() body: { refreshToken: string }) {
    return this.parentsService.refreshToken(body.refreshToken);
  }

  @Get('students')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked students' })
  getStudents(@CurrentUser() user: any) {
    return this.parentsService.getStudents(user.id);
  }

  @Get('students/:studentId/results')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student results' })
  getStudentResults(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.parentsService.getStudentResults(user.id, studentId);
  }

  @Get('students/:studentId/analytics')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student analytics' })
  getStudentAnalytics(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.parentsService.getStudentAnalytics(user.id, studentId);
  }

  @Get('students/:studentId/report-card/:termId')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download student report card' })
  async downloadReportCard(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Param('termId') termId: string,
    @Res() res: Response,
  ) {
    await this.parentsService.verifyParentOwnsStudent(user.id, studentId);
    const pdfBuffer = await this.pdfService.generateReportCard(studentId, termId, user.schoolId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-card-${studentId}-${termId}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  @Get('students/:studentId/transcript')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download student transcript' })
  async downloadTranscript(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Res() res: Response,
  ) {
    await this.parentsService.verifyParentOwnsStudent(user.id, studentId);
    const pdfBuffer = await this.pdfService.generateTranscript(studentId, user.schoolId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="transcript-${studentId}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  @Get('students/:studentId/academic-summary')
  @UseGuards(JwtParentAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download student academic summary' })
  async downloadAcademicSummary(
    @CurrentUser() user: any,
    @Param('studentId') studentId: string,
    @Res() res: Response,
  ) {
    await this.parentsService.verifyParentOwnsStudent(user.id, studentId);
    const pdfBuffer = await this.pdfService.generateAcademicSummary(studentId, user.schoolId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="academic-summary-${studentId}.pdf"`,
    });
    res.send(pdfBuffer);
  }
}
