import { Module } from '@nestjs/common';
import { ReportCardConfigController } from './report-card-config.controller';
import { ReportCardConfigService } from './report-card-config.service';
import { PdfModule } from '../../common/pdf/pdf.module';

@Module({
  imports: [PdfModule],
  controllers: [ReportCardConfigController],
  providers: [ReportCardConfigService],
  exports: [ReportCardConfigService],
})
export class ReportCardConfigModule {}
