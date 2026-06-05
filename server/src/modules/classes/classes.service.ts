import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassDto, currentUser: AuthenticatedUser) {
    // Check if class name already exists in the school
    const existingClass = await this.prisma.class.findFirst({
      where: {
        schoolId: currentUser.schoolId,
        name: dto.name,
        level: dto.level,
        deletedAt: null,
      },
    });

    if (existingClass) {
      throw new ConflictException('Class with this name and level already exists');
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

    const classEntity = await this.prisma.class.create({
      data: {
        schoolId: currentUser.schoolId,
        name: dto.name,
        level: dto.level,
        stream: dto.stream,
        capacity: dto.capacity,
        classTeacherId: dto.classTeacherId,
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
      message: 'Class created successfully',
      data: classEntity,
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