import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { BulkAssessmentDto } from './dto/bulk-assessment.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssessmentDto, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const existingAssessment = await this.prisma.assessment.findFirst({
      where: {
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        termId: dto.termId,
        type: dto.type,
      },
    });

    if (existingAssessment) {
      throw new ConflictException('Assessment already exists for this student, subject, term, and type');
    }

    if (dto.score > dto.maxScore) {
      throw new ForbiddenException('Score cannot exceed maximum score');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        schoolId: currentUser.schoolId,
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        termId: dto.termId,
        teacherId: currentUser.id,
        type: dto.type,
        score: dto.score,
        maxScore: dto.maxScore,
        weight: dto.weight ?? 1.0,
        createdBy: currentUser.id,
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
          },
        },
      },
    });

    return {
      success: true,
      message: 'Assessment created successfully',
      data: assessment,
    };
  }

  async bulkCreate(dto: BulkAssessmentDto, currentUser: AuthenticatedUser) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const studentIds = dto.assessments.map((a) => a.studentId);
    const students = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: currentUser.schoolId,
        deletedAt: null,
      },
    });

    if (students.length !== studentIds.length) {
      throw new NotFoundException('One or more students not found');
    }

    const results = {
      success: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const assessment of dto.assessments) {
      try {
        const existing = await this.prisma.assessment.findFirst({
          where: {
            studentId: assessment.studentId,
            subjectId: dto.subjectId,
            termId: dto.termId,
            type: assessment.type,
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        if (assessment.score > assessment.maxScore) {
          results.errors.push(`Score exceeds max score for student ${assessment.studentId}`);
          continue;
        }

        await this.prisma.assessment.create({
          data: {
            schoolId: currentUser.schoolId,
            studentId: assessment.studentId,
            subjectId: dto.subjectId,
            termId: dto.termId,
            teacherId: currentUser.id,
            type: assessment.type,
            score: assessment.score,
            maxScore: assessment.maxScore,
            weight: 1.0,
            createdBy: currentUser.id,
          },
        });

        results.success++;
      } catch (error) {
        results.errors.push(`Failed to create assessment for student ${assessment.studentId}`);
      }
    }

    return {
      success: true,
      message: 'Bulk assessment creation completed',
      data: results,
    };
  }

  async findAll(
    currentUser: AuthenticatedUser,
    page: number,
    limit: number,
    studentId?: string,
    subjectId?: string,
    termId?: string,
    type?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId: currentUser.schoolId,
    };

    if (studentId) where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;
    if (termId) where.termId = termId;
    if (type) where.type = type;

    const [assessments, total] = await Promise.all([
      this.prisma.assessment.findMany({
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
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return {
      success: true,
      message: 'Assessments retrieved successfully',
      data: assessments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const assessment = await this.prisma.assessment.findFirst({
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
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return {
      success: true,
      message: 'Assessment retrieved successfully',
      data: assessment,
    };
  }

  async update(id: string, dto: UpdateAssessmentDto, currentUser: AuthenticatedUser) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const newScore = dto.score ?? assessment.score;
    const newMaxScore = dto.maxScore ?? assessment.maxScore;
    if (newScore > newMaxScore) {
      throw new ForbiddenException('Score cannot exceed maximum score');
    }

    const updatedAssessment = await this.prisma.assessment.update({
      where: { id },
      data: {
        type: dto.type,
        score: dto.score,
        maxScore: dto.maxScore,
        weight: dto.weight,
        updatedBy: currentUser.id,
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
          },
        },
      },
    });

    return {
      success: true,
      message: 'Assessment updated successfully',
      data: updatedAssessment,
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    await this.prisma.assessment.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Assessment removed successfully',
    };
  }

  async getStudentAssessments(
    studentId: string,
    subjectId: string,
    termId: string,
    currentUser: AuthenticatedUser,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const assessments = await this.prisma.assessment.findMany({
      where: {
        studentId,
        subjectId,
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
        term: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { type: 'asc' },
    });

    return {
      success: true,
      message: 'Student assessments retrieved successfully',
      data: assessments,
    };
  }

  async getClassAssessments(
    classId: string,
    subjectId: string,
    termId: string,
    type: string,
    currentUser: AuthenticatedUser,
  ) {
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

    const assessments = await this.prisma.assessment.findMany({
      where: {
        studentId: { in: studentIds },
        subjectId,
        termId,
        type,
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
      },
      orderBy: { student: { firstName: 'asc' } },
    });

    return {
      success: true,
      message: 'Class assessments retrieved successfully',
      data: {
        students: enrollments.map((e) => e.student),
        assessments,
      },
    };
  }
}