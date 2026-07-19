import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PublishResultDto } from './dto/publish-result.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { PdfService } from '../../common/pdf/pdf.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { resolveGrade, assignPositions, calculateGPA, GradeScaleEntry } from './grading.util';
import { DomainEventsService, DOMAIN_EVENTS } from '../../common/events/domain-events.service';

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly domainEvents: DomainEventsService,
    @Optional() private readonly pdfService?: PdfService,
  ) {}

  async computeResults(
    classId: string,
    termId: string,
    currentUser: AuthenticatedUser,
    subjectIds?: string[],
  ) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const term = await this.prisma.term.findFirst({
      where: { id: termId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classId,
        termId,
        student: { schoolId: currentUser.schoolId },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException('No students enrolled in this class for the specified term');
    }

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        classId,
        subject: { schoolId: currentUser.schoolId },
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const targetSubjects =
      subjectIds && subjectIds.length > 0
        ? classSubjects.filter((cs) => subjectIds.includes(cs.subjectId))
        : classSubjects;

    if (targetSubjects.length === 0) {
      throw new BadRequestException('No subjects found for this class');
    }

    const gradeScales = (await this.prisma.gradeScale.findMany({
      where: { schoolId: currentUser.schoolId, isActive: true },
      orderBy: { minScore: 'desc' },
      select: {
        grade: true,
        minScore: true,
        maxScore: true,
        remark: true,
        points: true,
        isPass: true,
      },
    })) as unknown as GradeScaleEntry[];

    // Wrap all writes in a single transaction so a failure partway through
    // (e.g. on student 40 of 60) rolls back everything rather than leaving
    // a half-computed result set with no indication anything went wrong.
    const results = await this.prisma.$transaction(async (tx) => {
      const written: any[] = [];

      for (const enrollment of enrollments) {
        for (const classSubject of targetSubjects) {
          const assessments = await tx.assessment.findMany({
            where: {
              studentId: enrollment.studentId,
              subjectId: classSubject.subjectId,
              termId,
              schoolId: currentUser.schoolId,
            },
          });

          if (assessments.length === 0) {
            continue;
          }

          let totalWeightedScore = 0;
          let totalWeight = 0;

          for (const assessment of assessments) {
            const normalizedScore = (assessment.score / assessment.maxScore) * 100;
            totalWeightedScore += normalizedScore * assessment.weight;
            totalWeight += assessment.weight;
          }

          const finalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

          // Use the shared grading util against the school's real, configurable
          // GradeScale — not a hardcoded scale baked into this method.
          const { grade, remark, points, isPass } = resolveGrade(finalScore, gradeScales);

          const existingResult = await tx.result.findUnique({
            where: {
              studentId_subjectId_termId: {
                studentId: enrollment.studentId,
                subjectId: classSubject.subjectId,
                termId,
              },
            },
          });

          if (existingResult) {
            const updated = await tx.result.update({
              where: { id: existingResult.id },
              data: {
                totalScore: finalScore,
                grade,
                remark,
                points,
                isPass,
                updatedBy: currentUser.id,
              },
            });
            written.push(updated);
          } else {
            const created = await tx.result.create({
              data: {
                schoolId: currentUser.schoolId,
                studentId: enrollment.studentId,
                subjectId: classSubject.subjectId,
                termId,
                totalScore: finalScore,
                grade,
                remark,
                points,
                isPass,
                createdBy: currentUser.id,
              },
            });
            written.push(created);
          }
        }
      }

      return written;
    });

    this.domainEvents.emit(DOMAIN_EVENTS.RESULTS_COMPUTED, {
      schoolId: currentUser.schoolId,
      classId,
      termId,
      computedCount: results.length,
      computedBy: currentUser.id,
    });

    return {
      success: true,
      message: 'Results computed successfully',
      data: {
        computedCount: results.length,
        studentCount: enrollments.length,
        subjectCount: targetSubjects.length,
      },
    };
  }

  async publishResults(
    dto: PublishResultDto,
    currentUser: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const where: any = {
      schoolId: currentUser.schoolId,
      termId: dto.termId,
      isPublished: false,
    };

    if (dto.subjectIds && dto.subjectIds.length > 0) {
      where.subjectId = { in: dto.subjectIds };
    }

    // Publication is all-or-nothing for this batch — wrapped in a transaction
    // per the architecture spec, and leaves room for future steps (e.g. a
    // publication audit record) to join the same atomic unit.
    const updateResult = await this.prisma.$transaction(async (tx) => {
      return tx.result.updateMany({
        where,
        data: {
          isPublished: true,
          publishedAt: new Date(),
          updatedBy: currentUser.id,
        },
      });
    });

    // Audit log wiring (Cline — Phase 1 Task 2)
    await this.auditLogsService
      .logAction(
        currentUser.id,
        'RESULTS_PUBLISHED',
        'Result',
        dto.classId,
        undefined,
        { publishedCount: updateResult.count, termId: dto.termId },
        ipAddress,
        userAgent,
      )
      .catch(() => {});

    this.domainEvents.emit(DOMAIN_EVENTS.RESULTS_PUBLISHED, {
      schoolId: currentUser.schoolId,
      termId: dto.termId,
      subjectIds: dto.subjectIds,
      publishedCount: updateResult.count,
      publishedBy: currentUser.id,
    });

    return {
      success: true,
      message: 'Results published successfully',
      data: {
        publishedCount: updateResult.count,
      },
    };
  }

  async unpublishResults(
    dto: PublishResultDto,
    currentUser: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const where: any = {
      schoolId: currentUser.schoolId,
      termId: dto.termId,
      isPublished: true,
    };

    if (dto.subjectIds && dto.subjectIds.length > 0) {
      where.subjectId = { in: dto.subjectIds };
    }

    const updateResult = await this.prisma.result.updateMany({
      where,
      data: {
        isPublished: false,
        publishedAt: null,
        updatedBy: currentUser.id,
      },
    });

    // Audit log wiring (Cline — Phase 1 Task 2)
    await this.auditLogsService
      .logAction(
        currentUser.id,
        'RESULTS_UNPUBLISHED',
        'Result',
        dto.classId,
        undefined,
        { unpublishedCount: updateResult.count, termId: dto.termId },
        ipAddress,
        userAgent,
      )
      .catch(() => {});

    this.domainEvents.emit(DOMAIN_EVENTS.RESULTS_UNPUBLISHED, {
      schoolId: currentUser.schoolId,
      termId: dto.termId,
      subjectIds: dto.subjectIds,
      unpublishedCount: updateResult.count,
      unpublishedBy: currentUser.id,
    });

    return {
      success: true,
      message: 'Results unpublished successfully',
      data: {
        unpublishedCount: updateResult.count,
      },
    };
  }

  async findAll(
    currentUser: AuthenticatedUser,
    page: number,
    limit: number,
    studentId?: string,
    subjectId?: string,
    termId?: string,
    isPublished?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId: currentUser.schoolId,
    };

    if (studentId) where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;
    if (termId) where.termId = termId;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [results, total] = await Promise.all([
      this.prisma.result.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          term: {
            select: {
              id: true,
              name: true,
              session: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.result.count({ where }),
    ]);

    return {
      success: true,
      message: 'Results retrieved successfully',
      data: results,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const result = await this.prisma.result.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        term: {
          select: {
            id: true,
            name: true,
            session: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return {
      success: true,
      message: 'Result retrieved successfully',
      data: result,
    };
  }

  async getStudentResults(
    studentId: string,
    termId: string,
    currentUser: AuthenticatedUser,
    publishedOnly = false,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const where: any = {
      studentId,
      termId,
      schoolId: currentUser.schoolId,
    };
    if (publishedOnly) {
      where.isPublished = true;
    }

    const results = await this.prisma.result.findMany({
      where,
      select: {
        id: true,
        schoolId: true,
        studentId: true,
        subjectId: true,
        termId: true,
        totalScore: true,
        grade: true,
        remark: true,
        points: true,

        isPass: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        term: {
          select: {
            id: true,
            name: true,
            session: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { subject: { name: 'asc' } },
    });

    const totalSubjects = results.length;
    const totalScore = results.reduce((sum, r) => sum + r.totalScore, 0);
    const averageScore = totalSubjects > 0 ? totalScore / totalSubjects : 0;
    const resultsWithPoints = results.map((r) => ({ points: r.points ?? 0 }));
    const gpa = calculateGPA(resultsWithPoints);
    const passedSubjects = results.filter((r) => r.isPass === true).length;
    const failedSubjects = totalSubjects - passedSubjects;

    return {
      success: true,
      message: 'Student results retrieved successfully',
      data: {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
        },
        results,
        summary: {
          totalSubjects,
          averageScore: Math.round(averageScore * 100) / 100,
          gpa: Math.round(gpa * 100) / 100,
          passedSubjects,
          failedSubjects,
        },
      },
    };
  }

  async getClassResults(classId: string, termId: string, currentUser: AuthenticatedUser) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classId,
        termId,
        student: { schoolId: currentUser.schoolId },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const results = await this.prisma.result.findMany({
      where: {
        studentId: { in: studentIds },
        termId,
        schoolId: currentUser.schoolId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ student: { firstName: 'asc' } }, { subject: { name: 'asc' } }],
    });

    const subjectIds = [...new Set(results.map((r) => r.subjectId))];
    const subjects = await this.prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        schoolId: currentUser.schoolId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    return {
      success: true,
      message: 'Class results retrieved successfully',
      data: {
        class: {
          id: classEntity.id,
          name: classEntity.name,
          level: classEntity.level,
        },
        students: enrollments.map((e) => e.student),
        subjects,
        results,
      },
    };
  }

  async getBroadsheet(classId: string, termId: string, currentUser: AuthenticatedUser) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classId,
        termId,
        student: { schoolId: currentUser.schoolId },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { student: { firstName: 'asc' } },
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const results = await this.prisma.result.findMany({
      where: {
        studentId: { in: studentIds },
        termId,
        schoolId: currentUser.schoolId,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const subjectIds = [...new Set(results.map((r) => r.subjectId))];
    const subjects = await this.prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        schoolId: currentUser.schoolId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });

    const broadsheetData = enrollments.map((enrollment) => {
      const studentResults = results.filter((r) => r.studentId === enrollment.studentId);

      const subjectScores: Record<string, { score: number; grade: string | null }> = {};
      let totalScore = 0;

      for (const subject of subjects) {
        const result = studentResults.find((r) => r.subjectId === subject.id);
        if (result) {
          subjectScores[subject.code] = {
            score: Math.round(result.totalScore * 100) / 100,
            grade: result.grade,
          };
          totalScore += result.totalScore;
        } else {
          subjectScores[subject.code] = {
            score: 0,
            grade: null,
          };
        }
      }

      const averageScore = subjects.length > 0 ? totalScore / subjects.length : 0;

      return {
        student: enrollment.student,
        subjectScores,
        totalScore: Math.round(totalScore * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
      };
    });

    // Use the shared assignPositions util so JSON and PDF broadsheets
    // produce identical ranking — previously this was a hand-rolled
    // sort+forEach that the PDF broadsheet didn't replicate at all.
    const rankedBroadsheetData = assignPositions(broadsheetData);

    return {
      success: true,
      message: 'Broadsheet generated successfully',
      data: {
        class: {
          id: classEntity.id,
          name: classEntity.name,
          level: classEntity.level,
        },
        subjects,
        students: rankedBroadsheetData,
      },
    };
  }

  async getTranscriptData(studentId: string, currentUser: AuthenticatedUser): Promise<Buffer> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!this.pdfService) {
      throw new NotFoundException('PDF service unavailable');
    }

    return this.pdfService.generateTranscript(studentId, currentUser.schoolId);
  }
}
