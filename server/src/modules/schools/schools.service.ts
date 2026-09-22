import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateAcademicSettingsDto } from './dto/academic-settings.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { ROLES } from '../../common/constants/roles.constants';

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

  async findOne(id: string, currentUser: AuthenticatedUser) {
    // Platform-level SUPER_ADMIN may look up any school. Every other role
    // may only look up their own school — otherwise any authenticated user
    // could read another tenant's school profile (address, phone, email,
    // logo) just by knowing/guessing an id.
    if (!currentUser.roles.includes(ROLES.SUPER_ADMIN) && id !== currentUser.schoolId) {
      throw new NotFoundException('School not found');
    }

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

  async update(id: string, dto: UpdateSchoolDto, currentUser: AuthenticatedUser) {
    const isSuperAdmin = currentUser.roles.includes(ROLES.SUPER_ADMIN);

    // Same isolation rule as findOne: a SCHOOL_ADMIN may only update their
    // own school, never another tenant's.
    if (!isSuperAdmin && id !== currentUser.schoolId) {
      throw new NotFoundException('School not found');
    }

    // Suspending/reactivating a school is an explicit Super Admin capability
    // per spec ("suspend/reactivate schools") — a SCHOOL_ADMIN must not be
    // able to flip their own tenant's isActive flag.
    if (!isSuperAdmin && dto.isActive !== undefined) {
      throw new ForbiddenException(
        'Only a platform administrator can suspend or reactivate a school',
      );
    }

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

  async getSettings(schoolId: string) {
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });

    if (!settings) {
      // Return default settings if none exist
      return {
        success: true,
        message: 'Default settings retrieved',
        data: {
          gradingSystem: 'PERCENTAGE',
          passMark: 40,
          caWeight: 30,
          examWeight: 70,
          maxScore: 100,
          showPosition: true,
          showGrade: true,
          showRemark: true,
          resultTemplate: 'STANDARD',
        },
      };
    }

    return {
      success: true,
      message: 'Settings retrieved successfully',
      data: settings,
    };
  }

  async updateSettings(schoolId: string, dto: UpdateAcademicSettingsDto) {
    // Validate CA + Exam weights sum to 100
    if (dto.caWeight !== undefined && dto.examWeight !== undefined) {
      if (dto.caWeight + dto.examWeight !== 100) {
        throw new BadRequestException('CA weight and Exam weight must sum to 100');
      }
    }

    const settings = await this.prisma.schoolSettings.upsert({
      where: { schoolId },
      update: dto,
      create: {
        schoolId,
        ...dto,
      },
    });

    return {
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    };
  }
}
