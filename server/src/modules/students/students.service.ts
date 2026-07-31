import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { enforceEntityLimit } from '../../common/helpers/trial-limits.helper';
import { BulkStudentsService } from './bulk-students.service';
import { ImportResult } from '../../common/import/import-result.interface';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAdmissionNumber(schoolId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const schoolPrefix = schoolId.slice(0, 3).toUpperCase();

    // Get the last admission number for this school
    const lastStudent = await this.prisma.student.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastStudent) {
      const lastNumber = lastStudent.admissionNumber;
      const lastSequence = parseInt(lastNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${schoolPrefix}${year}${sequence.toString().padStart(4, '0')}`;
  }

  async create(dto: CreateStudentDto, currentUser: AuthenticatedUser) {
    await enforceEntityLimit(this.prisma, 'students', currentUser.schoolId);

    // Generate admission number
    const admissionNumber = await this.generateAdmissionNumber(currentUser.schoolId);

    const student = await this.prisma.student.create({
      data: {
        schoolId: currentUser.schoolId,
        admissionNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        parentName: dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        createdBy: currentUser.id,
      },
    });

    // Auto-enroll in class if classId provided and current term exists
    if (dto.classId) {
      const currentTerm = await this.prisma.term.findFirst({
        where: { schoolId: currentUser.schoolId, isCurrent: true },
      });

      if (currentTerm) {
        // Check for existing enrollment in this term
        const existingEnrollment = await this.prisma.enrollment.findFirst({
          where: { studentId: student.id, termId: currentTerm.id },
        });

        if (!existingEnrollment) {
          await this.prisma.enrollment.create({
            data: {
              studentId: student.id,
              classId: dto.classId,
              termId: currentTerm.id,
            },
          });
        }
      }
    }

    return {
      success: true,
      message: 'Student created successfully',
      data: student,
    };
  }

  async findAll(currentUser: AuthenticatedUser, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { schoolId: currentUser.schoolId, deletedAt: null };

    // Teachers only see students enrolled in their assigned classes
    if (currentUser.roles.includes('TEACHER') && !currentUser.roles.includes('SCHOOL_ADMIN') && !currentUser.roles.includes('SUPER_ADMIN')) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { userId: currentUser.id, schoolId: currentUser.schoolId, deletedAt: null },
        include: { subjectAssignments: { select: { classId: true } } },
      });
      if (teacher) {
        const classIds = [...new Set(teacher.subjectAssignments.map(a => a.classId))];
        if (classIds.length > 0) {
          where.enrollments = { some: { classId: { in: classIds } } };
        } else {
          // Teacher has no assignments — return empty
          return { success: true, message: 'Students retrieved successfully', data: [], meta: { page, limit, total: 0, totalPages: 0 } };
        }
      }
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          enrollments: {
            include: {
              class: true,
              term: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      success: true,
      message: 'Students retrieved successfully',
      data: students,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        enrollments: {
          include: {
            class: true,
            term: {
              include: {
                session: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      success: true,
      message: 'Student retrieved successfully',
      data: student,
    };
  }

  async update(id: string, dto: UpdateStudentDto, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        parentName: dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        isActive: dto.isActive,
        updatedBy: currentUser.id,
      },
    });

    return {
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent,
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Soft delete
    await this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: currentUser.id },
    });

    return {
      success: true,
      message: 'Student deleted successfully',
    };
  }

  async getStudentEnrollments(id: string, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: id },
      include: {
        class: true,
        term: {
          include: {
            session: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Student enrollments retrieved successfully',
      data: enrollments,
    };
  }

  async promoteStudents(
    dto: {
      fromClassId: string;
      toClassId: string;
      termId: string;
      nextTermId: string;
      studentIds?: string[];
    },
    currentUser: AuthenticatedUser,
  ) {
    const { fromClassId, toClassId, termId, nextTermId, studentIds } = dto;

    const fromClass = await this.prisma.class.findFirst({
      where: { id: fromClassId, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!fromClass) {
      throw new NotFoundException('Source class not found');
    }

    const toClass = await this.prisma.class.findFirst({
      where: { id: toClassId, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!toClass) {
      throw new NotFoundException('Target class not found');
    }

    const term = await this.prisma.term.findFirst({
      where: { id: termId, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!term) {
      throw new NotFoundException('Source term not found');
    }

    const nextTerm = await this.prisma.term.findFirst({
      where: { id: nextTermId, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!nextTerm) {
      throw new NotFoundException('Target term not found');
    }

    const enrollmentWhere: any = {
      classId: fromClassId,
      termId,
      student: { schoolId: currentUser.schoolId },
    };
    if (studentIds && studentIds.length > 0) {
      enrollmentWhere.studentId = { in: studentIds };
    }

    const sourceEnrollments = await this.prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: { studentId: true },
    });

    const studentIdsToPromote = sourceEnrollments.map((e) => e.studentId);

    if (studentIdsToPromote.length === 0) {
      return { promotedCount: 0, skippedCount: 0 };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const createManyResult = await tx.enrollment.createMany({
        data: studentIdsToPromote.map((studentId) => ({
          studentId,
          classId: toClassId,
          termId: nextTermId,
        })),
        skipDuplicates: true,
      });

      const promotedCount = createManyResult.count;
      const skippedCount = studentIdsToPromote.length - promotedCount;

      return { promotedCount, skippedCount };
    });

    return result;
  }

  async importCsv(schoolId: string, csvContent: string): Promise<ImportResult> {
    const bulkService = new BulkStudentsService(this.prisma);
    return bulkService.importStudents(schoolId, csvContent);
  }

  async export(schoolId: string, classId?: string, termId?: string) {
    const where: any = { schoolId, deletedAt: null };
    if (classId) {
      const enrollmentStudents = await this.prisma.enrollment
        .findMany({
          where: { classId, termId: termId || undefined },
          select: { studentId: true },
        })
        .then((enrollments) => enrollments.map((e) => e.studentId));
      where.id = { in: enrollmentStudents };
    }

    return this.prisma.student.findMany({
      where,
      select: {
        admissionNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        parentName: true,
        parentEmail: true,
        parentPhone: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}
