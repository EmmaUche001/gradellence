import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateReportCardConfigDto } from './dto/update-report-card-config.dto';

const DEFAULTS = {
  template: 'classic',
  accentColor: '#1a56db',
  showRanking: true,
  showCumulative: true,
  showAffective: true,
  showPsychomotor: true,
  showTeacherRemark: true,
  showPrincipalRemark: true,
  showResumptionDate: true,
  showStamp: true,
  showPoweredBy: true,
  affectiveTraits: [
    'Punctuality',
    'Neatness',
    'Honesty',
    'Cooperation',
    'Attentiveness',
    'Perseverance',
  ],
  psychomotorTraits: ['Drawing', 'Sports', 'Handwriting', 'Musical Skills'],
};

@Injectable()
export class ReportCardConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(schoolId: string) {
    const config = await this.prisma.reportCardConfig.findUnique({
      where: { schoolId },
    });

    if (!config) {
      return { schoolId, ...DEFAULTS };
    }

    return config;
  }

  async updateConfig(schoolId: string, dto: UpdateReportCardConfigDto) {
    const existing = await this.prisma.reportCardConfig.findUnique({
      where: { schoolId },
    });

    if (!existing) {
      return this.prisma.reportCardConfig.create({
        data: { schoolId, ...dto },
      });
    }

    return this.prisma.reportCardConfig.update({
      where: { schoolId },
      data: dto,
    });
  }
}
