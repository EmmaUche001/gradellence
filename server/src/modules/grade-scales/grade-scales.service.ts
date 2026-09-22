import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateGradeScaleDto } from './dto/create-grade-scale.dto';
import { UpdateGradeScaleDto } from './dto/update-grade-scale.dto';
import {
  BatchUpdateGradeScaleDto,
  BatchCreateGradeScaleDto,
  UpdateGradeScaleEntry,
} from './dto/batch-grade-scale.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { GradeScale } from '@prisma/client';

@Injectable()
export class GradeScalesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that a set of grade scales has no overlapping ranges
   */
  private validateNoOverlaps(scales: Array<{ minScore: number; maxScore: number; id?: string; grade?: string }>) {
    const sorted = [...scales].sort((a, b) => a.minScore - b.minScore);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Check for overlap: current max >= next min
      if (current.maxScore >= next.minScore) {
        const currentGrade = current.grade || `scale-${i}`;
        const nextGrade = next.grade || `scale-${i + 1}`;

        throw new ConflictException(
          `Score range ${current.minScore}-${current.maxScore} (${currentGrade}) overlaps with ${next.minScore}-${next.maxScore} (${nextGrade})`,
        );
      }

      // Check for gaps: current max + 1 < next min
      if (current.maxScore + 1 < next.minScore) {
        // This is actually OK in some grading systems, but let's warn
        // Commented out - gaps are allowed (e.g., 0-69 pass, 70-100 distinction)
        // const currentGrade = scales.find(s => s.id === current.id)?.grade || `scale-${i}`;
        // const nextGrade = scales.find(s => s.id === next.id)?.grade || `scale-${i + 1}`;
        // console.warn(`Gap between ${currentGrade} (${current.maxScore}) and ${nextGrade} (${next.minScore})`);
      }
    }
  }

  /**
   * Validate a single grade scale entry
   */
  private validateSingleScale(
    scale: { minScore: number; maxScore: number; grade: string },
    index: number,
  ) {
    if (scale.minScore < 0 || scale.minScore > 100) {
      throw new BadRequestException(`Scale ${index + 1} (${scale.grade}): minScore must be 0-100`);
    }
    if (scale.maxScore < 0 || scale.maxScore > 100) {
      throw new BadRequestException(`Scale ${index + 1} (${scale.grade}): maxScore must be 0-100`);
    }
    if (scale.minScore >= scale.maxScore) {
      throw new BadRequestException(
        `Scale ${index + 1} (${scale.grade}): minScore (${scale.minScore}) must be less than maxScore (${scale.maxScore})`,
      );
    }
    if (!scale.grade || scale.grade.trim() === '') {
      throw new BadRequestException(`Scale ${index + 1}: grade letter is required`);
    }
  }

  /**
   * Create a single grade scale
   */
  async create(dto: CreateGradeScaleDto, currentUser: AuthenticatedUser) {
    // Validate single scale
    this.validateSingleScale({ ...dto, grade: dto.grade }, 0);

    // Check for overlaps with existing active scales
    const overlapping = await this.prisma.gradeScale.findFirst({
      where: {
        schoolId: currentUser.schoolId,
        isActive: true,
        OR: [
          {
            AND: [
              { minScore: { lte: dto.maxScore } },
              { maxScore: { gte: dto.minScore } },
            ],
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

  /**
   * Create multiple grade scales in batch
   */
  async createBatch(dto: BatchCreateGradeScaleDto, currentUser: AuthenticatedUser) {
    const { scales } = dto;

    if (scales.length < 2) {
      throw new BadRequestException('Batch create requires at least 2 grade scales');
    }

    // Validate all scales
    scales.forEach((scale, index) => {
      this.validateSingleScale({ ...scale, grade: scale.grade }, index);
    });

    // Check for overlaps within the batch
    const batchScales = scales.map((s) => ({
      minScore: s.minScore,
      maxScore: s.maxScore,
      grade: s.grade,
    }));
    this.validateNoOverlaps(batchScales);

    // Check for overlaps with existing active scales
    const existingScales = await this.prisma.gradeScale.findMany({
      where: {
        schoolId: currentUser.schoolId,
        isActive: true,
      },
    });

    const allScales = [...batchScales, ...existingScales.map((s) => ({ minScore: s.minScore, maxScore: s.maxScore, grade: s.grade }))];
    this.validateNoOverlaps(allScales);

    // Create all scales
    const created = await this.prisma.$transaction(
      scales.map((scale) =>
        this.prisma.gradeScale.create({
          data: {
            schoolId: currentUser.schoolId,
            grade: scale.grade,
            minScore: scale.minScore,
            maxScore: scale.maxScore,
            remark: scale.remark,
            points: scale.points ?? 0,
            isActive: scale.isActive ?? true,
          },
        }),
      ),
    );

    return {
      success: true,
      message: `${created.length} grade scales created successfully`,
      data: created,
    };
  }

  /**
   * Find all grade scales with pagination
   */
  async findAll(currentUser: AuthenticatedUser, page: number, limit: number, isActive?: boolean) {
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId: currentUser.schoolId,
      isActive: isActive ?? true, // default: only return active grade scales
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

  /**
   * Find one grade scale by ID
   */
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

  /**
   * Update a single grade scale
   * Now allows partial updates to grade, remark, points, isActive WITHOUT triggering overlap validation
   */
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

    // Only check for overlaps if minScore or maxScore is being changed
    if (dto.minScore !== undefined || dto.maxScore !== undefined) {
      const minScore = dto.minScore ?? existing.minScore;
      const maxScore = dto.maxScore ?? existing.maxScore;

      const overlapping = await this.prisma.gradeScale.findFirst({
        where: {
          schoolId: currentUser.schoolId,
          id: { not: id },
          isActive: true,
          AND: [
            { minScore: { lte: maxScore } },
            { maxScore: { gte: minScore } },
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
      data: {
        ...dto,
        // Ensure points is always a number (default to 0 if undefined)
        points: dto.points ?? existing.points ?? 0,
      },
    });

    return {
      success: true,
      message: 'Grade scale updated successfully',
      data: gradeScale,
    };
  }

  /**
   * Batch update multiple grade scales in a transaction
   * This is the KEY addition: it validates all scales together and updates atomically
   */
  async updateBatch(dto: BatchUpdateGradeScaleDto, currentUser: AuthenticatedUser) {
    const { scales, validateOnly = false } = dto;

    if (scales.length < 1) {
      throw new BadRequestException('At least one grade scale must be provided');
    }

    // Fetch all current active scales for this school
    const currentScales = await this.prisma.gradeScale.findMany({
      where: {
        schoolId: currentUser.schoolId,
        isActive: true,
      },
    });

    // Build the proposed new state
    const proposedScales: Array<{ id?: string; minScore: number; maxScore: number; grade: string }> = [];

    for (const scale of scales) {
      const existing = currentScales.find((s) => s.id === scale.id);

      if (!existing && !scale.id) {
        throw new NotFoundException(`Grade scale with ID ${scale.id} not found`);
      }

      const minScore = scale.minScore ?? existing?.minScore ?? 0;
      const maxScore = scale.maxScore ?? existing?.maxScore ?? 100;

      // Validate each scale
      this.validateSingleScale({ minScore, maxScore, grade: scale.grade ?? existing?.grade ?? '' }, 0);

      proposedScales.push({
        id: scale.id,
        minScore,
        maxScore,
        grade: scale.grade ?? existing?.grade ?? '',
      });
    }

    // Validate all proposed scales together for overlaps
    this.validateNoOverlaps(proposedScales);

    // If validateOnly, return success
    if (validateOnly) {
      return {
        success: true,
        message: 'Validation passed - no overlaps detected',
        data: proposedScales,
      };
    }

    // Perform batch update in transaction
    const updated = await this.prisma.$transaction(async (prisma) => {
      const results: GradeScale[] = [];
      
      for (const scale of scales) {
        const existing = currentScales.find((s) => s.id === scale.id);

        if (!existing) {
          throw new NotFoundException(`Grade scale with ID ${scale.id} not found`);
        }

        const result = await prisma.gradeScale.update({
          where: { id: scale.id },
          data: {
            grade: scale.grade ?? existing.grade,
            minScore: scale.minScore ?? existing.minScore,
            maxScore: scale.maxScore ?? existing.maxScore,
            remark: scale.remark ?? existing.remark,
            points: scale.points ?? existing.points,
            isActive: scale.isActive ?? existing.isActive,
          },
        });
        results.push(result);
      }
      
      return results;
    });

    return {
      success: true,
      message: `${updated.length} grade scales updated successfully`,
      data: updated,
    };
  }

  /**
   * Soft delete a grade scale (sets isActive to false)
   */
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

  /**
   * Toggle grade scale active status
   */
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
    { grade: 'B2', minScore: 70, maxScore: 74, remark: 'Very Good', points: 4.0 },
    { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good', points: 3.5 },
    { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit', points: 3.0 },
    { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit', points: 2.5 },
    { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Credit', points: 2.0 },
    { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass', points: 1.5 },
    { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Pass', points: 1.0 },
    { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail', points: 0.0 },
  ] as const;

  /** Default assessment component weights per term */
  static readonly DEFAULT_ASSESSMENT_CONFIG = [
    { type: 'CA1', label: 'Continuous Assessment 1', maxScore: 20, weight: 0.20 },
    { type: 'CA2', label: 'Continuous Assessment 2', maxScore: 20, weight: 0.20 },
    { type: 'EXAM', label: 'Terminal Examination', maxScore: 60, weight: 0.60 },
  ] as const;

  /**
   * Seed default grade scales for a new school
   * Uses the recommended 9-point WAEC scale with proper points for GPA calculation
   */
  async seedDefaultsForSchool(schoolId: string): Promise<void> {
    // 1. Grade scales — only insert if none exist yet for this school
    const existing = await this.prisma.gradeScale.count({ where: { schoolId } });
    if (existing === 0) {
      await this.prisma.gradeScale.createMany({
        data: GradeScalesService.DEFAULT_GRADE_SCALES.map((g) => ({
          schoolId,
          grade: g.grade,
          minScore: g.minScore,
          maxScore: g.maxScore,
          remark: g.remark,
          points: g.points,
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
