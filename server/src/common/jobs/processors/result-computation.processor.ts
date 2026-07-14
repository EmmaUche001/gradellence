import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ResultsService } from '../../../modules/results/results.service';
import { AuthenticatedUser } from '../../../common/types/express.types';

export interface ResultComputationJob {
  classId: string;
  termId: string;
  schoolId: string;
  subjectIds?: string[];
  userId: string;
}

@Processor('result-computation')
export class ResultComputationProcessor extends WorkerHost {
  private readonly logger = new Logger(ResultComputationProcessor.name);

  constructor(private readonly resultsService: ResultsService) {
    super();
  }

  async process(job: Job<ResultComputationJob>): Promise<any> {
    const { classId, termId, schoolId, subjectIds, userId } = job.data;

    this.logger.log(
      `Processing result computation for class ${classId}, term ${termId}, school ${schoolId}`,
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

      const result = await this.resultsService.computeResults(
        classId,
        termId,
        currentUser,
        subjectIds,
      );
      this.logger.log(`Result computation completed successfully`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Result computation failed: ${err.message}`, err.stack);
      throw error;
    }
  }
}
