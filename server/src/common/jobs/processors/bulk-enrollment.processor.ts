import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<BulkEnrollmentJob>): Promise<any> {
    const { classId, termId, schoolId, studentIds } = job.data;

    this.logger.log(
      `Processing bulk enrollment for class ${classId}, term ${termId}, ${studentIds.length} students`,
    );

    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Verify class exists in this school
      const classExists = await this.prisma.class.findFirst({
        where: { id: classId, schoolId },
      });
      if (!classExists) {
        throw new Error(`Class ${classId} not found in school ${schoolId}`);
      }

      // Verify term exists in this school
      const termExists = await this.prisma.term.findFirst({
        where: { id: termId, schoolId },
      });
      if (!termExists) {
        throw new Error(`Term ${termId} not found in school ${schoolId}`);
      }

      // Process each student enrollment
      for (const studentId of studentIds) {
        try {
          // Check if student exists in this school
          const student = await this.prisma.student.findFirst({
            where: { id: studentId, schoolId },
          });
          if (!student) {
            results.failed++;
            results.errors.push(`Student ${studentId} not found`);
            continue;
          }

          // Check for duplicate enrollment (unique constraint: studentId + termId)
          const existing = await this.prisma.enrollment.findFirst({
            where: { studentId, termId },
          });
          if (existing) {
            results.failed++;
            results.errors.push(`Student ${studentId} already enrolled`);
            continue;
          }

          // Create enrollment
          await this.prisma.enrollment.create({
            data: {
              studentId,
              classId,
              termId,
            },
          });

          results.success++;
        } catch (err) {
          results.failed++;
          results.errors.push(`Student ${studentId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      this.logger.log(
        `Bulk enrollment completed: ${results.success} success, ${results.failed} failed`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Bulk enrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}