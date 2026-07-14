import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSubjectDto, BulkCreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AssignSubjectDto } from './dto/assign-subject.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { enforceEntityLimit } from '../../common/helpers/trial-limits.helper';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async bulkCreate(dto: BulkCreateSubjectDto, currentUser: AuthenticatedUser) {
    const created = [];
    const skipped = [];

    for (const subjectDto of dto.subjects) {
      const existing = await this.prisma.subject.findFirst({
        where: {
          schoolId: currentUser.schoolId,
          code: subjectDto.code,
          deletedAt: null,
        },
      });

      if (existing) {
        skipped.push(subjectDto.code);
        continue;
      }

      const subject = await this.prisma.subject.create({
        data: {
          schoolId: currentUser.schoolId,
          name: subjectDto.name,
          code: subjectDto.code,
          description: subjectDto.description,
          createdBy: currentUser.id,
        },
      });
      created.push(subject);
    }

    return {
      success: true,
      message: `${created.length} subject(s) created${skipped.length > 0 ? `, ${skipped.length} skipped (code exists): ${skipped.join(', ')}` : ''}`,
      data: created,
    };
  }

  async create(dto: CreateSubjectDto, currentUser: AuthenticatedUser) {
    await enforceEntityLimit(this.prisma, 'subjects', currentUser.schoolId);

    // Check if subject code already exists in the school
    const existingSubject = await this.prisma.subject.findFirst({
      where: {
        schoolId: currentUser.schoolId,
        code: dto.code,
        deletedAt: null,
      },
    });

    if (existingSubject) {
      throw new ConflictException('Subject with this code already exists');
    }

    const subject = await this.prisma.subject.create({
      data: {
        schoolId: currentUser.schoolId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });

    return {
      success: true,
      message: 'Subject created successfully',
      data: subject,
    };
  }

  async findAll(currentUser: AuthenticatedUser, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [subjects, total] = await Promise.all([
      this.prisma.subject.findMany({
        where: { schoolId: currentUser.schoolId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { classes: true },
          },
        },
      }),
      this.prisma.subject.count({
        where: { schoolId: currentUser.schoolId, deletedAt: null },
      }),
    ]);

    return {
      success: true,
      message: 'Subjects retrieved successfully',
      data: subjects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        classes: {
          include: {
            class: true,
          },
        },
        teacherAssignments: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            class: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return {
      success: true,
      message: 'Subject retrieved successfully',
      data: subject,
    };
  }

  async update(id: string, dto: UpdateSubjectDto, currentUser: AuthenticatedUser) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Check if code is being changed and if it already exists
    if (dto.code && dto.code !== subject.code) {
      const existingSubject = await this.prisma.subject.findFirst({
        where: {
          schoolId: currentUser.schoolId,
          code: dto.code,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingSubject) {
        throw new ConflictException('Subject with this code already exists');
      }
    }

    const updatedSubject = await this.prisma.subject.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.isActive,
      },
    });

    return {
      success: true,
      message: 'Subject updated successfully',
      data: updatedSubject,
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Soft delete
    await this.prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Subject deleted successfully',
    };
  }

  // Subject-Class Assignment
  async assignToClass(dto: AssignSubjectDto, currentUser: AuthenticatedUser) {
    // Validate subject exists
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    // Validate class exists
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: dto.classId,
          subjectId: dto.subjectId,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Subject is already assigned to this class');
    }

    await this.prisma.classSubject.create({
      data: {
        classId: dto.classId,
        subjectId: dto.subjectId,
      },
    });

    return {
      success: true,
      message: 'Subject assigned to class successfully',
    };
  }

  async removeFromClass(subjectId: string, classId: string, currentUser: AuthenticatedUser) {
    const assignment = await this.prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Subject assignment not found');
    }

    await this.prisma.classSubject.delete({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    });

    return {
      success: true,
      message: 'Subject removed from class successfully',
    };
  }

  async getClassSubjects(classId: string, currentUser: AuthenticatedUser) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    const subjects = await this.prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: true,
      },
    });

    return {
      success: true,
      message: 'Class subjects retrieved successfully',
      data: subjects.map((cs) => cs.subject),
    };
  }
}
