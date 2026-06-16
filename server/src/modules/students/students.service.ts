import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

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
    // Check subscription limit for students
    const subscription = await this.prisma.schoolSubscription.findFirst({
      where: { schoolId: currentUser.schoolId, status: 'ACTIVE' },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    // Check current student count
    const currentStudentCount = await this.prisma.student.count({
      where: { schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (currentStudentCount >= subscription.plan.maxStudents) {
      throw new ForbiddenException(
        `Student limit reached (${subscription.plan.maxStudents}). Upgrade your plan to add more students.`,
      );
    }

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

    return {
      success: true,
      message: 'Student created successfully',
      data: student,
    };
  }

  async findAll(currentUser: AuthenticatedUser, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { schoolId: currentUser.schoolId, deletedAt: null };

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
}
