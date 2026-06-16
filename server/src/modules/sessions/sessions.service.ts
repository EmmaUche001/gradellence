import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== SESSIONS ====================

  async createSession(dto: CreateSessionDto, currentUser: AuthenticatedUser) {
    // Validate dates
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    const session = await this.prisma.session.create({
      data: {
        schoolId: currentUser.schoolId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent,
      },
    });

    // If this session is set as current, unset all other sessions
    if (dto.isCurrent) {
      await this.prisma.session.updateMany({
        where: {
          schoolId: currentUser.schoolId,
          id: { not: session.id },
        },
        data: { isCurrent: false },
      });
    }

    return {
      success: true,
      message: 'Session created successfully',
      data: session,
    };
  }

  async findAllSessions(currentUser: AuthenticatedUser, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        where: { schoolId: currentUser.schoolId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: { terms: true },
          },
        },
      }),
      this.prisma.session.count({
        where: { schoolId: currentUser.schoolId, deletedAt: null },
      }),
    ]);

    return {
      success: true,
      message: 'Sessions retrieved successfully',
      data: sessions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneSession(id: string, currentUser: AuthenticatedUser) {
    const session = await this.prisma.session.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        terms: {
          where: { deletedAt: null },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      success: true,
      message: 'Session retrieved successfully',
      data: session,
    };
  }

  async updateSession(id: string, dto: UpdateSessionDto, currentUser: AuthenticatedUser) {
    const session = await this.prisma.session.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate dates if both provided
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    const updatedSession = await this.prisma.session.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isCurrent: dto.isCurrent,
        isActive: dto.isActive,
      },
    });

    // If this session is set as current, unset all other sessions
    if (dto.isCurrent) {
      await this.prisma.session.updateMany({
        where: {
          schoolId: currentUser.schoolId,
          id: { not: id },
        },
        data: { isCurrent: false },
      });
    }

    return {
      success: true,
      message: 'Session updated successfully',
      data: updatedSession,
    };
  }

  async removeSession(id: string, currentUser: AuthenticatedUser) {
    const session = await this.prisma.session.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Soft delete
    await this.prisma.session.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Session deleted successfully',
    };
  }

  async getCurrentSession(currentUser: AuthenticatedUser) {
    const session = await this.prisma.session.findFirst({
      where: { schoolId: currentUser.schoolId, isCurrent: true, deletedAt: null },
      include: {
        terms: {
          where: { deletedAt: null },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('No current session found');
    }

    return {
      success: true,
      message: 'Current session retrieved successfully',
      data: session,
    };
  }

  // ==================== TERMS ====================

  async createTerm(dto: CreateTermDto, currentUser: AuthenticatedUser) {
    // Validate session exists
    const session = await this.prisma.session.findFirst({
      where: { id: dto.sessionId, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate dates
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check if term dates are within session dates
    if (new Date(dto.startDate) < session.startDate || new Date(dto.endDate) > session.endDate) {
      throw new BadRequestException('Term dates must be within session dates');
    }

    const term = await this.prisma.term.create({
      data: {
        schoolId: currentUser.schoolId,
        sessionId: dto.sessionId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent,
      },
    });

    // If this term is set as current, unset all other terms in the same session
    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: {
          schoolId: currentUser.schoolId,
          id: { not: term.id },
        },
        data: { isCurrent: false },
      });
    }

    return {
      success: true,
      message: 'Term created successfully',
      data: term,
    };
  }

  async findAllTerms(sessionId: string, currentUser: AuthenticatedUser) {
    const terms = await this.prisma.term.findMany({
      where: {
        sessionId,
        schoolId: currentUser.schoolId,
        deletedAt: null,
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      success: true,
      message: 'Terms retrieved successfully',
      data: terms,
    };
  }

  async findOneTerm(id: string, currentUser: AuthenticatedUser) {
    const term = await this.prisma.term.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
      include: {
        session: true,
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return {
      success: true,
      message: 'Term retrieved successfully',
      data: term,
    };
  }

  async updateTerm(id: string, dto: UpdateTermDto, currentUser: AuthenticatedUser) {
    const term = await this.prisma.term.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Validate dates if both provided
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    const updatedTerm = await this.prisma.term.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isCurrent: dto.isCurrent,
        isActive: dto.isActive,
      },
    });

    // If this term is set as current, unset all other terms
    if (dto.isCurrent) {
      await this.prisma.term.updateMany({
        where: {
          schoolId: currentUser.schoolId,
          id: { not: id },
        },
        data: { isCurrent: false },
      });
    }

    return {
      success: true,
      message: 'Term updated successfully',
      data: updatedTerm,
    };
  }

  async removeTerm(id: string, currentUser: AuthenticatedUser) {
    const term = await this.prisma.term.findFirst({
      where: { id, schoolId: currentUser.schoolId, deletedAt: null },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    // Soft delete
    await this.prisma.term.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'Term deleted successfully',
    };
  }

  async getCurrentTerm(currentUser: AuthenticatedUser) {
    const term = await this.prisma.term.findFirst({
      where: { schoolId: currentUser.schoolId, isCurrent: true, deletedAt: null },
      include: {
        session: true,
      },
    });

    if (!term) {
      throw new NotFoundException('No current term found');
    }

    return {
      success: true,
      message: 'Current term retrieved successfully',
      data: term,
    };
  }
}
