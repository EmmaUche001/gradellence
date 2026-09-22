import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { BulkEnrollmentDto } from './dto/bulk-enrollment.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnrollmentDto, currentUser: AuthenticatedUser) {
    // Validate student exists
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validate class exists
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Validate term exists
    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Check if enrollment already exists
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_termId: {
          studentId: dto.studentId,
          termId: dto.termId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(
        'Student is already enrolled in this class for the specified term',
      );
    }

    // Check class capacity
    if (classEntity.capacity) {
      const currentEnrollments = await this.prisma.enrollment.count({
        where: { classId: dto.classId, termId: dto.termId },
      });

      if (currentEnrollments >= classEntity.capacity) {
        throw new BadRequestException('Class has reached maximum capacity');
      }
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: dto.studentId,
        classId: dto.classId,
        termId: dto.termId,
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
        class: {
          select: {
            id: true,
            name: true,
            level: true,
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
      message: 'Student enrolled successfully',
      data: enrollment,
    };
  }

  async bulkCreate(dto: BulkEnrollmentDto, currentUser: AuthenticatedUser) {
    // Validate class exists
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Validate term exists
    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Validate all students exist
    const students = await this.prisma.student.findMany({
      where: {
        id: { in: dto.studentIds },
        schoolId: currentUser.schoolId,
        deletedAt: null,
      },
    });

    if (students.length !== dto.studentIds.length) {
      throw new NotFoundException('One or more students not found');
    }

    // Check class capacity
    if (classEntity.capacity) {
      const currentEnrollments = await this.prisma.enrollment.count({
        where: { classId: dto.classId, termId: dto.termId },
      });

      if (currentEnrollments + dto.studentIds.length > classEntity.capacity) {
        throw new BadRequestException('Class capacity would be exceeded');
      }
    }

    // Create enrollments, skipping duplicates
    const results = {
      success: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const studentId of dto.studentIds) {
      try {
        const existing = await this.prisma.enrollment.findUnique({
          where: {
            studentId_termId: {
              studentId,
              termId: dto.termId,
            },
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await this.prisma.enrollment.create({
          data: {
            studentId,
            classId: dto.classId,
            termId: dto.termId,
          },
        });

        results.success++;
      } catch (error) {
        results.errors.push(`Failed to enroll student ${studentId}`);
      }
    }

    return {
      success: true,
      message: 'Bulk enrollment completed',
      data: results,
    };
  }

  async findAll(
    currentUser: AuthenticatedUser,
    page: number,
    limit: number,
    classId?: string,
    termId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      student: {
        schoolId: currentUser.schoolId,
        deletedAt: null,             // ← exclude soft-deleted students
      },
    };

    if (classId) {
      where.classId = classId;
    }

    if (termId) {
      where.termId = termId;
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
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
          class: {
            select: {
              id: true,
              name: true,
              level: true,
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
      this.prisma.enrollment.count({ where }),
    ]);

    return {
      success: true,
      message: 'Enrollments retrieved successfully',
      data: enrollments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id,
        student: {
          schoolId: currentUser.schoolId,
          deletedAt: null,           // ← exclude soft-deleted students
        },
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
        class: {
          select: {
            id: true,
            name: true,
            level: true,
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

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return {
      success: true,
      message: 'Enrollment retrieved successfully',
      data: enrollment,
    };
  }

  async update(id: string, dto: UpdateEnrollmentDto, currentUser: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id,
        student: {
          schoolId: currentUser.schoolId,
          deletedAt: null,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Validate new class if provided
    if (dto.classId) {
      const classEntity = await this.prisma.class.findFirst({
        where: { id: dto.classId, schoolId: currentUser.schoolId, deletedAt: null },
      });

      if (!classEntity) {
        throw new NotFoundException('Class not found');
      }
    }

    // Validate new term if provided
    if (dto.termId) {
      const term = await this.prisma.term.findFirst({
        where: { id: dto.termId, schoolId: currentUser.schoolId, deletedAt: null },
      });

      if (!term) {
        throw new NotFoundException('Term not found');
      }
    }

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id },
      data: {
        classId: dto.classId,
        termId: dto.termId,
        status: dto.status,
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
        class: {
          select: {
            id: true,
            name: true,
            level: true,
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

    return {
      success: true,
      message: 'Enrollment updated successfully',
      data: updatedEnrollment,
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id,
        student: {
          schoolId: currentUser.schoolId,
          deletedAt: null,
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    await this.prisma.enrollment.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Enrollment removed successfully',
    };
  }

  async getClassEnrollments(classId: string, termId: string, currentUser: AuthenticatedUser) {
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
        student: {
          schoolId: currentUser.schoolId,
          deletedAt: null,           // ← CRITICAL: exclude soft-deleted students
        },
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
      message: 'Class enrollments retrieved successfully',
      data: enrollments,
    };
  }
}
