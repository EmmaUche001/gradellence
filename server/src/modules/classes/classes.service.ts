import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { enforceEntityLimit } from '../../common/helpers/trial-limits.helper';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  private deriveLevel(name: string): number {
    const n = name.trim().toLowerCase();

    // Nursery
    const nurseryMatch = n.match(/nursery\s*(\d+)/);
    if (nurseryMatch) return parseInt(nurseryMatch[1]);

    // Primary / Basic
    const primaryMatch = n.match(/(?:primary|basic)\s*(\d+)/);
    if (primaryMatch) return parseInt(primaryMatch[1]);

    // JSS / JS / Junior
    const jssMatch = n.match(/(?:jss|js|junior)\s*(\d+)/);
    if (jssMatch) return 6 + parseInt(jssMatch[1]);

    // SS / SSS / Senior
    const ssMatch = n.match(/(?:sss|ss|senior)\s*(\d+)/);
    if (ssMatch) return 9 + parseInt(ssMatch[1]);

    return 99;
  }

  async create(dto: CreateClassDto, currentUser: AuthenticatedUser) {
    await enforceEntityLimit(this.prisma, 'classes', currentUser.schoolId);

    const names = dto.names
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);

    const created = [];
    const skipped = [];

    for (const name of names) {
      const level = this.deriveLevel(name);

      // Check for duplicate within school
      const existing = await this.prisma.class.findFirst({
        where: { schoolId: currentUser.schoolId, name, deletedAt: null },
      });

      if (existing) {
        skipped.push(name);
        continue;
      }

      const cls = await this.prisma.class.create({
        data: {
          schoolId: currentUser.schoolId,
          name,
          level,
          createdBy: currentUser.id,
        },
      });
      created.push(cls);
    }

    return {
      success: true,
      message: `${created.length} class(es) created${skipped.length > 0 ? `, ${skipped.length} skipped (already exist): ${skipped.join(', ')}` : ''}`,
      data: created,
    };
  }

  async findAll(currentUser: AuthenticatedUser, page: number, limit: number, level?: number) {
    const skip = (page - 1) * limit;

    const where: any = { schoolId: currentUser.schoolId, deletedAt: null };
    if (level) {
      where.level = level;
    }

    const [classes, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        include: {
          classTeacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      }),
      this.prisma.class.count({ where }),
    ]);

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        subjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return {
      success: true,
      message: 'Class retrieved successfully',
      data: classEntity,
    };
  }

  async update(id: string, dto: UpdateClassDto, currentUser: AuthenticatedUser) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Check if name is being changed and if it already exists
    if (dto.name && dto.name !== classEntity.name) {
      const existingClass = await this.prisma.class.findFirst({
        where: {
          schoolId: currentUser.schoolId,
          name: dto.name,
          level: dto.level || classEntity.level,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingClass) {
        throw new ConflictException('Class with this name and level already exists');
      }
    }

    // Validate class teacher if provided
    if (dto.classTeacherId) {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: dto.classTeacherId, schoolId: currentUser.schoolId, deletedAt: null },
      });

      if (!teacher) {
        throw new NotFoundException('Class teacher not found');
      }
    }

    const updatedClass = await this.prisma.class.update({
      where: { id },
      data: {
        name: dto.name,
        level: dto.level,
        stream: dto.stream,
        capacity: dto.capacity,
        classTeacherId: dto.classTeacherId,
        isActive: dto.isActive,
      },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Class updated successfully',
      data: updatedClass,
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Check if class has enrollments
    const enrollmentCount = await this.prisma.enrollment.count({
      where: { classId: id },
    });

    if (enrollmentCount > 0) {
      throw new BadRequestException('Cannot delete class with active enrollments');
    }

    // Soft delete
    await this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Class deleted successfully',
    };
  }

  async assignSubjects(classId: string, subjectIds: string[], currentUser: AuthenticatedUser) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const created = [];
    const skipped = [];

    for (const subjectId of subjectIds) {
      const existing = await this.prisma.classSubject.findUnique({
        where: { classId_subjectId: { classId, subjectId } },
      });
      if (existing) {
        skipped.push(subjectId);
        continue;
      }

      await this.prisma.classSubject.create({
        data: { classId, subjectId },
      });
      created.push(subjectId);

      // If class has a class teacher, auto-create TeacherSubject for the new subject
      if (cls.classTeacherId) {
        const existingTeacherSubject = await this.prisma.teacherSubject.findUnique({
          where: {
            teacherId_subjectId_classId: {
              teacherId: cls.classTeacherId,
              subjectId,
              classId,
            },
          },
        });
        if (!existingTeacherSubject) {
          await this.prisma.teacherSubject.create({
            data: {
              teacherId: cls.classTeacherId,
              subjectId,
              classId,
            },
          });
        }
      }
    }

    return {
      success: true,
      message: `${created.length} subject(s) assigned, ${skipped.length} already existed`,
      data: { classId, assigned: created, skipped },
    };
  }

  async removeSubject(classId: string, subjectId: string, currentUser: AuthenticatedUser) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!cls) throw new NotFoundException('Class not found');

    await this.prisma.classSubject.delete({
      where: { classId_subjectId: { classId, subjectId } },
    });

    return { success: true, message: 'Subject removed from class' };
  }

  async getClassSubjects(classId: string, currentUser: AuthenticatedUser) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        subjects: { include: { subject: true } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');

    return {
      success: true,
      message: 'Class subjects retrieved',
      data: cls.subjects.map((cs) => cs.subject),
    };
  }

  async getClassesByLevel(level: number, currentUser: AuthenticatedUser) {
    const classes = await this.prisma.class.findMany({
      where: { schoolId: currentUser.schoolId, level, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Classes retrieved successfully',
      data: classes,
    };
  }
}
