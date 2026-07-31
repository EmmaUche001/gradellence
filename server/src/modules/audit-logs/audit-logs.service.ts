import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/types/express.types';
import { ROLES } from '../../common/constants/roles.constants';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    currentUser: AuthenticatedUser,
    page: number,
    limit: number,
    actorId?: string,
    action?: string,
    entityType?: string,
    entityId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    // SUPER_ADMIN sees logs across every school. SCHOOL_ADMIN sees all logs
    // within their school. TEACHER only sees their own actions.
    if (!currentUser.roles.includes(ROLES.SUPER_ADMIN)) {
      where.actor = { schoolId: currentUser.schoolId };
      // Teachers can only see their own audit trail
      if (currentUser.roles.includes('TEACHER') && !currentUser.roles.includes(ROLES.SCHOOL_ADMIN)) {
        where.actorId = currentUser.id;
      }
    }

    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      message: 'Audit logs retrieved successfully',
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const isSuperAdmin = currentUser.roles.includes(ROLES.SUPER_ADMIN);

    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            schoolId: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    // Same isolation rule as findAll: a non-SUPER_ADMIN can only fetch a log
    // entry whose actor belongs to their own school. Use Forbidden rather
    // than NotFound here since the id was already confirmed to exist —
    // NotFound would have been indistinguishable from a typo'd id, which is
    // fine for findAll's filtered list but unnecessary to fake here.
    if (!isSuperAdmin && log.actor.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('You do not have access to this audit log');
    }

    return {
      success: true,
      message: 'Audit log retrieved successfully',
      data: log,
    };
  }

  async logAction(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    previousValue?: any,
    newValue?: any,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        previousValue: previousValue || undefined,
        newValue: newValue || undefined,
        ipAddress,
        userAgent,
      },
    });
  }
}
