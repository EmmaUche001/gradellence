import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedUser } from '../../common/types/express.types';
import { ROLES } from '../../common/constants/roles.constants';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateUserDto, currentUser: AuthenticatedUser) {
    // Check if user can create users for this school
    if (currentUser.roles.includes(ROLES.SCHOOL_ADMIN) && dto.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Cannot create users for another school');
    }

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        schoolId: dto.schoolId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        createdBy: currentUser.id,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Assign roles if provided
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({
          userId: user.id,
          roleId,
        })),
      });
    }

    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        roles: user.roles.map((ur) => ur.role.name),
      },
    };
  }

  async findAll(currentUser: AuthenticatedUser, page: number, limit: number) {
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: any = { deletedAt: null };

    if (currentUser.roles.includes(ROLES.SCHOOL_ADMIN)) {
      // School admins only see users from their own school
      // and never see SUPER_ADMIN accounts
      where.schoolId = currentUser.schoolId;
      where.roles = {
        none: {
          role: { name: ROLES.SUPER_ADMIN },
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        isActive: user.isActive,
        roles: user.roles.map((ur) => ur.role.name),
        createdAt: user.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can access this user's data
    if (currentUser.roles.includes(ROLES.SCHOOL_ADMIN) && user.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Cannot access users from another school');
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        roles: user.roles.map((ur) => ur.role.name),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can update this user
    if (currentUser.roles.includes(ROLES.SCHOOL_ADMIN) && user.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Cannot update users from another school');
    }

    // Check if email is being changed and if it already exists
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const updateData: any = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      avatar: dto.avatar,
      isActive: dto.isActive,
      updatedBy: currentUser.id,
    };

    // Hash password if provided
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Update roles if provided
    if (dto.roleIds) {
      // Fetch old role ids before mutation
      const oldRoles = await this.prisma.userRole.findMany({
        where: { userId: id },
        select: { roleId: true },
      });
      const oldRoleIds = oldRoles.map((r) => r.roleId);

      // Only log if roles actually changed
      const changed =
        oldRoleIds.length !== dto.roleIds.length ||
        !oldRoleIds.every((r) => dto.roleIds!.includes(r));

      // Remove existing roles
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Add new roles
      if (dto.roleIds.length > 0) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
        });
      }

      if (changed) {
        await this.auditLogsService
          .logAction(
            currentUser.id,
            'ROLE_CHANGED',
            'User',
            id,
            oldRoleIds,
            dto.roleIds,
            ipAddress,
            userAgent,
          )
          .catch(() => {});

        // Notify the affected user (non-fatal)
        this.notificationsService.create({
          userId: id,
          schoolId: updatedUser.schoolId,
          type: 'ROLE_CHANGED',
          title: 'Your roles have been updated',
          body: `Your account permissions were updated by an administrator.`,
          link: '/dashboard',
        }).catch(() => {});
      }
    }

    return {
      success: true,
      message: 'User updated successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        schoolId: updatedUser.schoolId,
        isActive: updatedUser.isActive,
        roles: updatedUser.roles.map((ur) => ur.role.name),
      },
    };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can delete this user
    if (currentUser.roles.includes(ROLES.SCHOOL_ADMIN) && user.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Cannot delete users from another school');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: currentUser.id },
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
