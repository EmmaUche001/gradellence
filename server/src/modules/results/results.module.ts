import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { PrismaModule } from '../../database/prisma.module';
import { PdfModule } from '../../common/pdf/pdf.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ResultComputationProcessor } from '../../common/jobs/processors/result-computation.processor';

@Module({
  imports: [PrismaModule, PdfModule, AuditLogsModule],
  controllers: [ResultsController],
  providers: [ResultsService, ResultComputationProcessor],
  exports: [ResultsService],
})
export class ResultsModule {}
