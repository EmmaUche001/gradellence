import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { PrismaModule } from '../../database/prisma.module';
import { BulkEnrollmentProcessor } from '../../common/jobs/processors/bulk-enrollment.processor';

@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, BulkEnrollmentProcessor],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
