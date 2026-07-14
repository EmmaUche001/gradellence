import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EnrollmentsService } from '../../../modules/enrollments/enrollments.service';
import { AuthenticatedUser } from '../../../common/types/express.types';

export interface BulkEnrollmentJob {
  classId: string;
  termId: string;
  schoolId: string;
  studentIds: string[];
  userId: string;
}

@Processor('bulk-enrollment')
export class BulkEnrollmentProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkEnrollmentProcessor.name);

  constructor(private readonly enrollmentsService: EnrollmentsService) {
    super();
  }

  async process(job: Job<BulkEnrollmentJob>): Promise<any> {
    const { classId, termId, schoolId, studentIds, userId } = job.data;

    this.logger.log(
      `Processing bulk enrollment for class ${classId}, term ${termId}, ${studentIds.length} students`,
    );

    try {
      const currentUser: AuthenticatedUser = {
        id: userId,
        schoolId,
        email: '',
        firstName: '',
        lastName: '',
        roles: [],
        permissions: [],
      };

      const dto = {
        classId,
        termId,
        studentIds,
      };

      const result = await this.enrollmentsService.bulkCreate(dto, currentUser);
      this.logger.log(`Bulk enrollment completed successfully`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Bulk enrollment failed: ${err.message}`, err.stack);
      throw error;
    }
  }
}
