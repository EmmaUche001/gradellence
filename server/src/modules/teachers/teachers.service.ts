import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { AssignTeacherDto } from './dto/assign-teacher.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { enforceEntityLimit } from '../../common/helpers/trial-limits.helper';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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
    await enforceEntityLimit(this.prisma, 'teachers', currentUser.schoolId);

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

    // Provision login account for teacher and capture temp password for UI display
    let tempPasswordForAdmin: string | null = null;

    if (dto.email) {
      try {
        // Generate temporary password (12 chars, alphanumeric)
        let tempPassword = crypto
          .randomBytes(9)
          .toString('base64')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 12);
        if (tempPassword.length < 12) {
          tempPassword = crypto.randomBytes(6).toString('hex').slice(0, 12);
        }
        const passwordHash = await bcrypt.hash(tempPassword, 12);

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

        // Check if user with this email already exists
        let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

        if (user) {
          // Reset their password so the admin can share fresh credentials
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash, isActive: true },
          });

          // Unlink this user from any other (soft-deleted) teacher records to avoid unique constraint
          await this.prisma.teacher.updateMany({
            where: { userId: user.id, schoolId: teacher.schoolId, id: { not: teacher.id } },
            data: { userId: null } as any,
          });
        } else {
          // Create fresh user account
          user = await this.prisma.user.create({
            data: {
              schoolId: teacher.schoolId,
              email: dto.email,
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              roles: { create: { roleId: teacherRole.id } },
            },
          });
        }

        // Link user back to teacher
        await this.prisma.teacher.update({
          where: { id: teacher.id },
          data: { userId: user.id } as any,
        });

        // Always expose temp password to admin
        tempPasswordForAdmin = tempPassword;

        // Queue credentials email (non-fatal)
        this.emailQueue.add('send', {
          to: dto.email,
          subject: 'Your Teacher Account Credentials',
          template: 'teacher-credentials',
          data: {
            firstName: dto.firstName,
            email: dto.email,
            temporaryPassword: tempPassword,
            loginUrl: process.env.FRONTEND_URL || '',
          },
        }).catch(() => {});

      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Teacher provisioning error:', e);
      }
    }

    return {
      success: true,
      message: 'Teacher created successfully',
      data: teacher,
      ...(tempPasswordForAdmin ? { temporaryPassword: tempPasswordForAdmin } : {}),
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

    // Auto-unassign from any classes where this teacher is the class teacher
    await this.prisma.class.updateMany({
      where: { classTeacherId: id, schoolId: currentUser.schoolId, deletedAt: null },
      data: { classTeacherId: null },
    });

    // Remove all subject assignments for this teacher
    await this.prisma.teacherSubject.deleteMany({
      where: { teacherId: id },
    });

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

    // Notify the teacher if they have a linked user account (non-fatal)
    if (teacher.userId) {
      this.notificationsService.create({
        userId: teacher.userId,
        schoolId: currentUser.schoolId,
        type: 'ASSIGNMENT',
        title: 'New Subject Assignment',
        body: `You have been assigned to teach ${subject.name} for ${classEntity.name}.`,
        link: '/teachers/me',
      }).catch(() => {});
    }

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

  async assignAsClassTeacher(teacherId: string, classId: string, currentUser: AuthenticatedUser) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        subjects: { include: { subject: true } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');

    await this.prisma.class.update({
      where: { id: classId },
      data: { classTeacherId: teacherId },
    });

    const created: string[] = [];
    const skipped: string[] = [];

    for (const classSubject of cls.subjects) {
      const existing = await this.prisma.teacherSubject.findUnique({
        where: {
          teacherId_subjectId_classId: {
            teacherId,
            subjectId: classSubject.subjectId,
            classId,
          },
        },
      });

      if (existing) {
        skipped.push(classSubject.subjectId);
        continue;
      }

      await this.prisma.teacherSubject.create({
        data: { teacherId, subjectId: classSubject.subjectId, classId },
      });
      created.push(classSubject.subjectId);
    }

    // Notify the teacher if they have a linked user account (non-fatal)
    if (teacher.userId) {
      this.notificationsService.create({
        userId: teacher.userId,
        schoolId: currentUser.schoolId,
        type: 'ASSIGNMENT',
        title: 'Class Teacher Appointment',
        body: `You have been appointed as class teacher for ${cls.name}.`,
        link: '/teachers/me',
      }).catch(() => {});
    }

    return {
      success: true,
      message: `Teacher assigned as class teacher. ${created.length} subject assignment(s) created automatically.`,
      data: { teacherId, classId, subjectsAssigned: created },
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

  async findMyProfile(currentUser: AuthenticatedUser) {
    // Look up the Teacher record linked to this user
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        userId: (currentUser as any).id,
        schoolId: currentUser.schoolId,
        deletedAt: null,
      } as any,
      include: {
        classTeacher: {
          include: {
            _count: { select: { enrollments: true } },
            subjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
          },
        },
        subjectAssignments: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            class: { select: { id: true, name: true, level: true } },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found for this user');
    }

    // Unique classes this teacher is assigned to
    const classIds = [...new Set(teacher.subjectAssignments.map((a: any) => a.classId))];

    // Assessment stats for this teacher's classes
    const [myAssessments] = await Promise.all([
      this.prisma.assessment.count({
        where: { schoolId: currentUser.schoolId, teacherId: teacher.id },
      }),
    ]);
    const pendingAssessments = 0; // assessments don't have published state — use results for that

    // Student count across assigned classes (current enrollments)
    const studentCount =
      classIds.length > 0
        ? await this.prisma.enrollment.count({
            where: {
              classId: { in: classIds as string[] },
              student: { schoolId: currentUser.schoolId },
            },
          })
        : 0;

    return {
      success: true,
      message: 'Teacher profile retrieved successfully',
      data: {
        teacher,
        stats: {
          classCount: classIds.length,
          studentCount,
          totalAssessments: myAssessments,
          pendingAssessments,
        },
      },
    };
  }
}
