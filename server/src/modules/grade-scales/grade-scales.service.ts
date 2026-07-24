import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGradeScaleDto } from './dto/create-grade-scale.dto';
import { UpdateGradeScaleDto } from './dto/update-grade-scale.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class GradeScalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGradeScaleDto, currentUser: AuthenticatedUser) {
    // Validate score range does not overlap with existing active scales
    const overlapping = await this.prisma.gradeScale.findFirst({
      where: {
        schoolId: currentUser.schoolId,
        isActive: true,
        OR: [
          {
            minScore: { lte: dto.maxScore },
            maxScore: { gte: dto.minScore },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `Score range ${dto.minScore}-${dto.maxScore} overlaps with existing grade "${overlapping.grade}" (${overlapping.minScore}-${overlapping.maxScore})`,
      );
    }

    const gradeScale = await this.prisma.gradeScale.create({
      data: {
        schoolId: currentUser.schoolId,
        grade: dto.grade,
        minScore: dto.minScore,
        maxScore: dto.maxScore,
        remark: dto.remark,
        points: dto.points ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      success: true,
      message: 'Grade scale created successfully',
      data: gradeScale,
    };
  }

  async findAll(currentUser: AuthenticatedUser, page: number, limit: number, isActive?: boolean) {
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId: currentUser.schoolId,
      isActive: isActive ?? true,  // default: only return active grade scales
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [gradeScales, total] = await Promise.all([
      this.prisma.gradeScale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { minScore: 'desc' },
      }),
      this.prisma.gradeScale.count({ where }),
    ]);

    return {
      success: true,
      message: 'Grade scales retrieved successfully',
      data: gradeScales,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const gradeScale = await this.prisma.gradeScale.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId,
        isActive: true,
      },
    });

    if (!gradeScale) {
      throw new NotFoundException('Grade scale not found');
    }

    return {
      success: true,
      message: 'Grade scale retrieved successfully',
      data: gradeScale,
    };
  }

  async update(id: string, dto: UpdateGradeScaleDto, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.gradeScale.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Grade scale not found');
    }

    // Check for overlapping ranges if score bounds changed
    if (dto.minScore !== undefined || dto.maxScore !== undefined) {
      const minScore = dto.minScore ?? existing.minScore;
      const maxScore = dto.maxScore ?? existing.maxScore;

      const overlapping = await this.prisma.gradeScale.findFirst({
        where: {
          schoolId: currentUser.schoolId,
          id: { not: id },
          isActive: true,
          OR: [
            {
              minScore: { lte: maxScore },
              maxScore: { gte: minScore },
            },
          ],
        },
      });

      if (overlapping) {
        throw new ConflictException(
          `Score range ${minScore}-${maxScore} overlaps with existing grade "${overlapping.grade}" (${overlapping.minScore}-${overlapping.maxScore})`,
        );
      }
    }

    const gradeScale = await this.prisma.gradeScale.update({
      where: { id },
      data: dto,
    });

    return {
      success: true,
      message: 'Grade scale updated successfully',
      data: gradeScale,
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.gradeScale.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Grade scale not found');
    }

    // Soft delete by setting isActive to false
    await this.prisma.gradeScale.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Grade scale deleted successfully',
    };
  }

  async toggleActive(id: string, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.gradeScale.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Grade scale not found');
    }

    const gradeScale = await this.prisma.gradeScale.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return {
      success: true,
      message: `Grade scale ${gradeScale.isActive ? 'activated' : 'deactivated'} successfully`,
      data: gradeScale,
    };
  }

  // ── Default seeding on school onboarding ─────────────────────────────────

  /** Nigerian WAEC 9-point grade scale — seeded once per school on registration */
  static readonly DEFAULT_GRADE_SCALES = [
    { grade: 'A1', minScore: 75, maxScore: 100, remark: 'Distinction', points: 5.0 },
    { grade: 'B2', minScore: 70, maxScore: 74,  remark: 'Very Good',   points: 4.0 },
    { grade: 'B3', minScore: 65, maxScore: 69,  remark: 'Good',        points: 3.5 },
    { grade: 'C4', minScore: 60, maxScore: 64,  remark: 'Credit',      points: 3.0 },
    { grade: 'C5', minScore: 55, maxScore: 59,  remark: 'Credit',      points: 2.5 },
    { grade: 'C6', minScore: 50, maxScore: 54,  remark: 'Credit',      points: 2.0 },
    { grade: 'D7', minScore: 45, maxScore: 49,  remark: 'Pass',        points: 1.5 },
    { grade: 'E8', minScore: 40, maxScore: 44,  remark: 'Pass',        points: 1.0 },
    { grade: 'F9', minScore: 0,  maxScore: 39,  remark: 'Fail',        points: 0.0 },
  ] as const;

  /** Default assessment component weights per term */
  static readonly DEFAULT_ASSESSMENT_CONFIG = [
    { type: 'CA1',  label: 'Continuous Assessment 1', maxScore: 20, weight: 0.20 },
    { type: 'CA2',  label: 'Continuous Assessment 2', maxScore: 20, weight: 0.20 },
    { type: 'EXAM', label: 'Terminal Examination',    maxScore: 60, weight: 0.60 },
  ] as const;

  async seedDefaultsForSchool(schoolId: string): Promise<void> {
    // 1. Grade scales — only insert if none exist yet for this school
    const existing = await this.prisma.gradeScale.count({ where: { schoolId } });
    if (existing === 0) {
      await this.prisma.gradeScale.createMany({
        data: GradeScalesService.DEFAULT_GRADE_SCALES.map(g => ({
          schoolId,
          grade:    g.grade,
          minScore: g.minScore,
          maxScore: g.maxScore,
          remark:   g.remark,
          points:   g.points,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    // 2. Assessment config — store on school record if not already set
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { assessmentConfig: true },
    });
    if (!school?.assessmentConfig) {
      await this.prisma.school.update({
        where: { id: schoolId },
        data: {
          assessmentConfig: GradeScalesService.DEFAULT_ASSESSMENT_CONFIG as any,
        },
      });
    }
  }
}
