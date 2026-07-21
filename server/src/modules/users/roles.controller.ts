import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedRequest } from '../../common/types/express.types';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RATE_LIMIT_PRESETS } from '../../common/constants/rate-limit.constants';
import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
} from 'class-validator';

class CreateRoleDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds?: string[];
}

class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds?: string[];
}

class UpdateUserRolesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  roleIds!: string[];
}

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all roles for this school' })
  async findAll(@Request() req: AuthenticatedRequest) {
    const where = req.user.roles?.includes(ROLES.SUPER_ADMIN)
      ? {}
      : { OR: [{ schoolId: req.user.schoolId }, { schoolId: null }] };

    const roles = await this.prisma.role.findMany({
      where,
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      message: 'Roles retrieved successfully',
      data: roles.map(r => ({
        ...r,
        isGlobal: r.schoolId === null,
        permissions: r.permissions.map(rp => rp.permission),
      })),
    };
  }

  @Get('permissions/all')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get all available permissions' })
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
    return {
      success: true,
      message: 'Permissions retrieved successfully',
      data: permissions,
    };
  }

  @Get('users/:userId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get roles assigned to a user' })
  async getUserRoles(@Param('userId') userId: string, @Request() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId: req.user.schoolId, deletedAt: null },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    if (!user) {
      return { success: false, message: 'User not found', data: null };
    }

    return {
      success: true,
      message: 'User roles retrieved',
      data: {
        userId: user.id,
        roles: user.roles.map(ur => ({
          ...ur.role,
          permissions: ur.role.permissions.map(rp => rp.permission),
        })),
      },
    };
  }

  @Get(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get a role by ID' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        OR: [{ schoolId: req.user.schoolId }, { schoolId: null }],
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      return { success: false, message: 'Role not found', data: null };
    }

    return {
      success: true,
      message: 'Role retrieved successfully',
      data: {
        ...role,
        isGlobal: role.schoolId === null,
        permissions: role.permissions.map(rp => rp.permission),
      },
    };
  }

  @Post()
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Create a new role' })
  async create(@Body() dto: CreateRoleDto, @Request() req: AuthenticatedRequest) {
    const role = await this.prisma.role.create({
      data: {
        schoolId: req.user.schoolId,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map(permissionId => ({ permissionId })),
            }
          : undefined,
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    return {
      success: true,
      message: 'Role created successfully',
      data: {
        ...role,
        isGlobal: false,
        permissions: role.permissions.map(rp => rp.permission),
      },
    };
  }

  @Patch(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });

    if (!role) {
      return { success: false, message: 'Role not found or cannot be modified', data: null };
    }

    // Update basic fields
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;

    // Replace permissions if provided
    if (dto.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissionIds.map(permissionId => ({ roleId: id, permissionId })),
        });
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: updateData,
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    return {
      success: true,
      message: 'Role updated successfully',
      data: {
        ...updated,
        isGlobal: updated.schoolId === null,
        permissions: updated.permissions.map(rp => rp.permission),
      },
    };
  }

  @Delete(':id')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.DELETE)
  @ApiOperation({ summary: 'Delete a role' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const role = await this.prisma.role.findFirst({
      where: { id, schoolId: req.user.schoolId },
    });

    if (!role) {
      return { success: false, message: 'Role not found or cannot be deleted', data: null };
    }

    // Remove all permission and user associations first
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });

    return { success: true, message: 'Role deleted successfully' };
  }

  @Patch('users/:userId')
  @Roles(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN)
  @RateLimit(RATE_LIMIT_PRESETS.WRITE)
  @ApiOperation({ summary: 'Update roles assigned to a user' })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRolesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId: req.user.schoolId, deletedAt: null },
    });

    if (!user) {
      return { success: false, message: 'User not found', data: null };
    }

    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (dto.roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map(roleId => ({ userId, roleId })),
      });
    }

    return { success: true, message: 'User roles updated successfully' };
  }
}
