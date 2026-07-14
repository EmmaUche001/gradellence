import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ExportModule } from '../../common/export/export.module';

@Module({
  imports: [PrismaModule, AuditLogsModule, ExportModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
