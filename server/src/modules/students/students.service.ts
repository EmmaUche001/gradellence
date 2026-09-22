import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { enforceEntityLimit } from '../../common/helpers/trial-limits.helper';
import { BulkStudentsService } from './bulk-students.service';
import { ImportResult } from '../../common/import/import-result.interface';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Cache invalidation ────────────────────────────────────────────────────
  // The cache interceptor stores GET /v1/students keys as:
  //   srms:cache:GET:/v1/students:{query}:user:{userId}
  // After any write/delete we must evict all variants for this user.
  private async invalidateStudentCache(userId: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      if (!client || client.status !== 'ready') return;
      const pattern = `srms:cache:GET:/v1/students*:user:${userId}`;
      let cursor = '0';
      const keys: string[] = [];
      do {
        const [next, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        keys.push(...batch);
      } while (cursor !== '0');
      if (keys.length > 0) await client.del(...keys);
    } catch {
      // Never let cache errors surface to callers
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  async generateAdmissionNumber(schoolId: string): Promise<string> {
    const year         = new Date().getFullYear().toString().slice(-2);
    const schoolPrefix = schoolId.slice(0, 3).toUpperCase();
    const lastStudent  = await this.prisma.student.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
    let sequence = 1;
    if (lastStudent) {
      const lastSequence = parseInt(lastStudent.admissionNumber.slice(-4), 10);
      if (!isNaN(lastSequence)) sequence = lastSequence + 1;
    }
    return `${schoolPrefix}${year}${sequence.toString().padStart(4, '0')}`;
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(dto: CreateStudentDto, currentUser: AuthenticatedUser) {
    await enforceEntityLimit(this.prisma, 'students', currentUser.schoolId);

    const admissionNumber = await this.generateAdmissionNumber(currentUser.schoolId);

    const student = await this.prisma.student.create({
      data: {
        schoolId:    currentUser.schoolId,
        admissionNumber,
        firstName:   dto.firstName,
        lastName:    dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender:      dto.gender,
        address:     dto.address,
        phone:       dto.phone,
        email:       dto.email,
        parentName:  dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        createdBy:   currentUser.id,
      },
    });

    if (dto.classId) {
      const currentTerm = await this.prisma.term.findFirst({
        where: { schoolId: currentUser.schoolId, isCurrent: true },
      });
      if (currentTerm) {
        const existing = await this.prisma.enrollment.findFirst({
          where: { studentId: student.id, termId: currentTerm.id },
        });
        if (!existing) {
          await this.prisma.enrollment.create({
            data: { studentId: student.id, classId: dto.classId, termId: currentTerm.id },
          });
        }
      }
    }

    await this.invalidateStudentCache(currentUser.id);

    return { success: true, message: 'Student created successfully', data: student };
  }

  // ─── Find all ──────────────────────────────────────────────────────────────
  async findAll(
    currentUser: AuthenticatedUser,
    page: number,
    limit: number,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { schoolId: currentUser.schoolId, deletedAt: null };

    if (
      currentUser.roles.includes('TEACHER') &&
      !currentUser.roles.includes('SCHOOL_ADMIN') &&
      !currentUser.roles.includes('SUPER_ADMIN')
    ) {
      const teacher = await this.prisma.teacher.findFirst({
        where:   { userId: currentUser.id, schoolId: currentUser.schoolId, deletedAt: null },
        include: { subjectAssignments: { select: { classId: true } } },
      });
      if (teacher) {
        const classIds = [...new Set(teacher.subjectAssignments.map(a => a.classId))];
        if (classIds.length > 0) {
          where.enrollments = { some: { classId: { in: classIds } } };
        } else {
          return {
            success: true, message: 'Students retrieved successfully', data: [],
            meta: { page, limit, total: 0, totalPages: 0 },
          };
        }
      }
    }

    if (search) {
      where.OR = [
        { firstName:       { contains: search, mode: 'insensitive' } },
        { lastName:        { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { email:           { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take:      limit,
        orderBy:   { createdAt: 'desc' },
        include: {
          enrollments: {
            include:  { class: true, term: true },
            orderBy:  { createdAt: 'desc' },
            take:     1,
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      success: true, message: 'Students retrieved successfully', data: students,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Find one ──────────────────────────────────────────────────────────────
  async findOne(id: string, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where:   { id, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        enrollments: {
          include:  { class: true, term: { include: { session: true } } },
          orderBy:  { createdAt: 'desc' },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return { success: true, message: 'Student retrieved successfully', data: student };
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateStudentDto, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Student not found');

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        firstName:   dto.firstName,
        lastName:    dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender:      dto.gender,
        address:     dto.address,
        phone:       dto.phone,
        email:       dto.email,
        parentName:  dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        isActive:    dto.isActive,
        updatedBy:   currentUser.id,
      },
    });

    await this.invalidateStudentCache(currentUser.id);

    return { success: true, message: 'Student updated successfully', data: updated };
  }

  // ─── Remove one ────────────────────────────────────────────────────────────
  async remove(id: string, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.$transaction([
      this.prisma.student.update({
        where: { id },
        data:  { deletedAt: new Date(), updatedBy: currentUser.id },
      }),
      // Hard-delete enrollments so stale IDs can't leak into score-entry queries
      this.prisma.enrollment.deleteMany({ where: { studentId: id } }),
    ]);

    await this.invalidateStudentCache(currentUser.id);

    return { success: true, message: 'Student deleted successfully' };
  }

  // ─── Bulk remove — single endpoint, no rate-limit storm ───────────────────
  async bulkRemove(ids: string[], currentUser: AuthenticatedUser) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No student IDs provided');
    }
    if (ids.length > 500) {
      throw new BadRequestException('Cannot delete more than 500 students at once');
    }

    // Verify all IDs belong to this school and are not already deleted
    const found = await this.prisma.student.findMany({
      where: { id: { in: ids }, schoolId: currentUser.schoolId, deletedAt: null },
      select: { id: true },
    });
    const foundIds = found.map(s => s.id);

    if (foundIds.length === 0) {
      throw new NotFoundException('No matching students found');
    }

    // Execute in a single transaction: soft-delete students + hard-delete enrollments
    await this.prisma.$transaction([
      this.prisma.student.updateMany({
        where: { id: { in: foundIds } },
        data:  { deletedAt: new Date(), updatedBy: currentUser.id },
      }),
      this.prisma.enrollment.deleteMany({
        where: { studentId: { in: foundIds } },
      }),
    ]);

    await this.invalidateStudentCache(currentUser.id);

    return {
      success: true,
      message: `${foundIds.length} student${foundIds.length !== 1 ? 's' : ''} deleted successfully`,
      data: { deleted: foundIds.length, notFound: ids.length - foundIds.length },
    };
  }

  // ─── Student enrollments ───────────────────────────────────────────────────
  async getStudentEnrollments(id: string, currentUser: AuthenticatedUser) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Student not found');

    const enrollments = await this.prisma.enrollment.findMany({
      where:   { studentId: id },
      include: { class: true, term: { include: { session: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, message: 'Student enrollments retrieved successfully', data: enrollments };
  }

  // ─── Promote ───────────────────────────────────────────────────────────────
  async promoteStudents(
    dto: {
      fromClassId: string; toClassId: string;
      termId: string; nextTermId: string; studentIds?: string[];
    },
    currentUser: AuthenticatedUser,
  ) {
    const { fromClassId, toClassId, termId, nextTermId, studentIds } = dto;

    const [fromClass, toClass, term, nextTerm] = await Promise.all([
      this.prisma.class.findFirst({ where: { id: fromClassId, schoolId: currentUser.schoolId, deletedAt: null } }),
      this.prisma.class.findFirst({ where: { id: toClassId,   schoolId: currentUser.schoolId, deletedAt: null } }),
      this.prisma.term.findFirst({  where: { id: termId,      schoolId: currentUser.schoolId, deletedAt: null } }),
      this.prisma.term.findFirst({  where: { id: nextTermId,  schoolId: currentUser.schoolId, deletedAt: null } }),
    ]);

    if (!fromClass) throw new NotFoundException('Source class not found');
    if (!toClass)   throw new NotFoundException('Target class not found');
    if (!term)      throw new NotFoundException('Source term not found');
    if (!nextTerm)  throw new NotFoundException('Target term not found');

    const enrollmentWhere: any = {
      classId: fromClassId, termId,
      student: { schoolId: currentUser.schoolId },
    };
    if (studentIds?.length) enrollmentWhere.studentId = { in: studentIds };

    const sourceEnrollments = await this.prisma.enrollment.findMany({
      where: enrollmentWhere, select: { studentId: true },
    });
    const idsToPromote = sourceEnrollments.map(e => e.studentId);
    if (idsToPromote.length === 0) return { promotedCount: 0, skippedCount: 0 };

    const result = await this.prisma.$transaction(async (tx) => {
      const r = await tx.enrollment.createMany({
        data: idsToPromote.map(sid => ({ studentId: sid, classId: toClassId, termId: nextTermId })),
        skipDuplicates: true,
      });
      return { promotedCount: r.count, skippedCount: idsToPromote.length - r.count };
    });

    return result;
  }

  // ─── Import CSV ────────────────────────────────────────────────────────────
  async importCsv(schoolId: string, csvContent: string, classId?: string, termId?: string) {
    const svc = new BulkStudentsService(this.prisma);
    return svc.importStudents(schoolId, csvContent, classId, termId);
  }

  // ─── Export ────────────────────────────────────────────────────────────────
  async export(schoolId: string, classId?: string, termId?: string) {
    const where: any = { schoolId, deletedAt: null };
    if (classId) {
      const ids = await this.prisma.enrollment
        .findMany({ where: { classId, termId: termId || undefined }, select: { studentId: true } })
        .then(e => e.map(x => x.studentId));
      where.id = { in: ids };
    }
    return this.prisma.student.findMany({
      where,
      select: {
        admissionNumber: true, firstName: true, lastName: true,
        dateOfBirth: true, gender: true, parentName: true,
        parentEmail: true, parentPhone: true, isActive: true, createdAt: true,
      },
    });
  }
}
