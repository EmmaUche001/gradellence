import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSchoolDto) {
    // Check if slug already exists
    const existingSchool = await this.prisma.school.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSchool) {
      throw new ConflictException('School slug already exists');
    }

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        logo: dto.logo,
      },
    });

    return {
      success: true,
      message: 'School created successfully',
      data: school,
    };
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count({
        where: { deletedAt: null },
      }),
    ]);

    return {
      success: true,
      message: 'Schools retrieved successfully',
      data: schools,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, deletedAt: null },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return {
      success: true,
      message: 'School retrieved successfully',
      data: school,
    };
  }

  async update(id: string, dto: UpdateSchoolDto) {
    const school = await this.prisma.school.findFirst({
      where: { id, deletedAt: null },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check if slug is being changed and if it already exists
    if (dto.slug && dto.slug !== school.slug) {
      const existingSchool = await this.prisma.school.findUnique({
        where: { slug: dto.slug },
      });

      if (existingSchool) {
        throw new ConflictException('School slug already exists');
      }
    }

    const updatedSchool = await this.prisma.school.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        logo: dto.logo,
        isActive: dto.isActive,
      },
    });

    return {
      success: true,
      message: 'School updated successfully',
      data: updatedSchool,
    };
  }

  async remove(id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, deletedAt: null },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Soft delete
    await this.prisma.school.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'School deleted successfully',
    };
  }
}