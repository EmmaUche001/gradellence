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
}