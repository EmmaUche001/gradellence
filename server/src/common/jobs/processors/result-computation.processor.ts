import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ResultComputationJob>): Promise<any> {
    const { classId, termId, schoolId, subjectIds, userId } = job.data;
    
    this.logger.log(
      `Processing result computation for class ${classId}, term ${termId}, school ${schoolId}`,
    );

    try {
      // Get all enrollments for this class and term (through student's school)
      const enrollments = await this.prisma.enrollment.findMany({
        where: { 
          classId, 
          termId,
          student: { schoolId },
        },
        include: { student: true },
      });

      // Get assessments for this class and term
      const assessments = await this.prisma.assessment.findMany({
        where: {
          schoolId,
          termId,
          ...(subjectIds?.length ? { subjectId: { in: subjectIds } } : {}),
        },
      });

      // Compute results for each student
      const results = [];
      for (const enrollment of enrollments) {
        const studentAssessments = assessments.filter(
          (a) => a.studentId === enrollment.studentId,
        );

        // Group by subject
        const subjectGroups = new Map<string, typeof studentAssessments>();
        for (const assessment of studentAssessments) {
          const group = subjectGroups.get(assessment.subjectId) || [];
          group.push(assessment);
          subjectGroups.set(assessment.subjectId, group);
        }

        for (const [subjectId, subjectAssessments] of subjectGroups) {
          const totalScore = subjectAssessments.reduce(
            (sum, a) => sum + (a.score || 0),
            0,
          );

          results.push({
            studentId: enrollment.studentId,
            subjectId,
            termId,
            schoolId,
            totalScore,
            createdBy: userId,
          });
        }
      }

      // Upsert results using the correct unique constraint
      for (const result of results) {
        await this.prisma.result.upsert({
          where: {
            studentId_subjectId_termId: {
              studentId: result.studentId,
              subjectId: result.subjectId,
              termId: result.termId,
            },
          },
          update: {
            totalScore: result.totalScore,
            updatedBy: result.createdBy,
          },
          create: result,
        });
      }

      this.logger.log(
        `Result computation completed: ${results.length} results computed`,
      );

      return { success: true, count: results.length };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Result computation failed: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}