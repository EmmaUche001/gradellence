import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async generateEmployeeId(schoolId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const schoolPrefix = schoolId.slice(0, 3).toUpperCase();

    const lastTeacher = await this.prisma.teacher.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });

    let sequence = 1;
    if (lastTeacher) {
      const lastNumber = lastTeacher.employeeId;
      const lastSequence = parseInt(lastNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${schoolPrefix}T${year}${sequence.toString().padStart(4, '0')}`;
  }

  async create(dto: CreateTeacherDto, currentUser: AuthenticatedUser) {
    // Check subscription limit for users (teachers count as users)
    const subscription = await this.prisma.schoolSubscription.findFirst({
      where: { schoolId: currentUser.schoolId, status: 'ACTIVE' },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    // Check current teacher count (users)
    const currentUserCount = await this.prisma.user.count({
      where: { schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (currentUserCount >= subscription.plan.maxUsers) {
      throw new ForbiddenException(
        `User limit reached (${subscription.plan.maxUsers}). Upgrade your plan to add more users.`,
      );
    }

    const employeeId = await this.generateEmployeeId(currentUser.schoolId);

    const teacher = await this.prisma.teacher.create({
      data: {
        schoolId: currentUser.schoolId,
        employeeId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        qualification: dto.qualification,
        createdBy: currentUser.id,
      },
    });

    // Provision login account for teacher (non-fatal)
    (async () => {
      try {
        if (!dto.email) return;
        // Generate temporary password (12 chars, alphanumeric)
        let tempPassword = crypto
          .randomBytes(9)
          .toString('base64')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 12);
        if (tempPassword.length < 12) {
          // fallback to hex if base64 trimmed short
          tempPassword = crypto.randomBytes(6).toString('hex').slice(0, 12);
        }
        const passwordHash = await argon2.hash(tempPassword);

        // Find or create TEACHER role scoped to the school
        let teacherRole = await this.prisma.role.findFirst({
          where: { schoolId: teacher.schoolId, name: 'TEACHER' },
        });
        if (!teacherRole) {
          teacherRole = await this.prisma.role.create({
            data: {
              schoolId: teacher.schoolId,
              name: 'TEACHER',
              description: 'Teacher account',
            },
          });
        }

        // Create user and link role
        try {
          const user = await this.prisma.user.create({
            data: {
              schoolId: teacher.schoolId,
              email: dto.email,
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              roles: { create: { roleId: teacherRole.id } },
            },
          });

          // Link user back to teacher
          await this.prisma.teacher.update({
            where: { id: teacher.id },
            // Cast to any to avoid type mismatch until Prisma client is regenerated after schema changes
            data: { userId: user.id } as any,
          });

          // Queue credentials email
          try {
            await this.emailQueue.add('send', {
              to: dto.email,
              subject: 'Your Teacher Account Credentials',
              template: 'teacher-credentials',
              data: {
                firstName: dto.firstName,
                email: dto.email,
                temporaryPassword: tempPassword,
                loginUrl: process.env.FRONTEND_URL || '',
              },
            });
          } catch (e) {
            // Non-fatal: log and continue
            // eslint-disable-next-line no-console
            console.error('Failed to queue teacher credentials email:', e);
          }
        } catch (e) {
          // Non-fatal: user creation failed (e.g., duplicate email). Log and continue.
          // eslint-disable-next-line no-console
          console.error('Failed to provision teacher user account:', e);
        }
      } catch (e) {
        // Catch-all for provisioning errors; do not block teacher creation.
        // eslint-disable-next-line no-console
        console.error('Teacher provisioning error:', e);
      }
    })();

    return {
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
    };
  }

  async findAll(currentUser: AuthenticatedUser, page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { schoolId: currentUser.schoolId, deletedAt: null };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [teachers, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          classTeacher: true,
          subjectAssignments: {
            include: {
              subject: true,
              class: true,
            },
          },
        },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      success: true,
      message: 'Teachers retrieved successfully',
      data: teachers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        classTeacher: true,
        subjectAssignments: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return {
      success: true,
      message: 'Teacher retrieved successfully',
      data: teacher,
    };
  }

  async update(id: string, dto: UpdateTeacherDto, currentUser: AuthenticatedUser) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const updatedTeacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        qualification: dto.qualification,
        isActive: dto.isActive,
        updatedBy: currentUser.id,
      },
    });

    return {
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher,
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Check if teacher is assigned as class teacher
    const classCount = await this.prisma.class.count({
      where: { classTeacherId: id, deletedAt: null },
    });

    if (classCount > 0) {
      throw new ConflictException('Cannot delete teacher assigned as class teacher');
    }

    // Soft delete
    await this.prisma.teacher.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: currentUser.id },
    });

    return {
      success: true,
      message: 'Teacher deleted successfully',
    };
  }

  // Teacher-Subject Assignment
  async assignToSubject(dto: AssignTeacherDto, currentUser: AuthenticatedUser) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: dto.teacherId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_classId: {
          teacherId: dto.teacherId,
          subjectId: dto.subjectId,
          classId: dto.classId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Teacher is already assigned to this subject and class');
    }

    await this.prisma.teacherSubject.create({
      data: {
        teacherId: dto.teacherId,
        subjectId: dto.subjectId,
        classId: dto.classId,
      },
    });

    return {
      success: true,
      message: 'Teacher assigned to subject successfully',
    };
  }

  async removeFromSubject(
    teacherId: string,
    subjectId: string,
    classId: string,
    currentUser: AuthenticatedUser,
  ) {
    const assignment = await this.prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId_classId: {
          teacherId,
          subjectId,
          classId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Teacher assignment not found');
    }

    await this.prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId_classId: {
          teacherId,
          subjectId,
          classId,
        },
      },
    });

    return {
      success: true,
      message: 'Teacher removed from subject successfully',
    };
  }

  async getTeacherAssignments(id: string, currentUser: AuthenticatedUser) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const assignments = await this.prisma.teacherSubject.findMany({
      where: { teacherId: id },
      include: {
        subject: true,
        class: true,
      },
    });

    return {
      success: true,
      message: 'Teacher assignments retrieved successfully',
      data: assignments,
    };
  }
}
