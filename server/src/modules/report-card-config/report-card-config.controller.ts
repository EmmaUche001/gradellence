import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportCardConfigService } from './report-card-config.service';
import { UpdateReportCardConfigDto } from './dto/update-report-card-config.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';
import type { AuthenticatedUser } from '../../common/types/express.types';
import { PdfService } from '../../common/pdf/pdf.service';
import { Response } from 'express';

@ApiTags('Report Card Config')
@ApiBearerAuth('JWT-auth')
@Controller('report-card-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportCardConfigController {
  constructor(
    private readonly configService: ReportCardConfigService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.READ)
  @ApiOperation({ summary: 'Get report card configuration for the school' })
  @ApiResponse({ status: 200, description: 'Report card config returned' })
  async getConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.configService.getConfig(user.schoolId);
  }

  @Put()
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update report card configuration' })
  @ApiResponse({ status: 200, description: 'Config updated successfully' })
  async updateConfig(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateReportCardConfigDto,
  ) {
    return this.configService.updateConfig(user.schoolId, dto);
  }

  @Get('preview')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
  @RateLimit(RATE_LIMIT_PRESETS.READ)
  @ApiOperation({ summary: 'Generate a sample report card PDF preview using current config' })
  @ApiResponse({ status: 200, description: 'Sample report card PDF' })
  async previewReportCard(
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generatePreviewReportCard(user.schoolId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="report-card-preview.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
