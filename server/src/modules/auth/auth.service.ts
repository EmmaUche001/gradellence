import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from '../../common/types/express.types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GradeScalesService } from '../grade-scales/grade-scales.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AuditLogsService,
    private readonly gradeScalesService: GradeScalesService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const normalizeSlug = (alias: string) =>
      alias
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .slice(0, 50);

    const slug = normalizeSlug(dto.schoolAlias);

    let school = null;
    try {
      school = await this.prisma.school.upsert({
        where: { slug },
        update: {},
        create: {
          name: dto.schoolName,
          alias: dto.schoolAlias,
          slug,
        },
      });
    } catch (e) {
      school = await this.prisma.school.findUnique({ where: { slug } });
      if (!school) {
        throw e;
      }
    }

    let schoolAdminRole = await this.prisma.role.findFirst({
      where: { schoolId: school.id, name: 'SCHOOL_ADMIN' },
    });
    if (!schoolAdminRole) {
      schoolAdminRole = await this.prisma.role.create({
        data: {
          schoolId: school.id,
          name: 'SCHOOL_ADMIN',
          description: 'School administrator with full access',
        },
      });
    }

    const user = await this.prisma.user.create({
      data: {
        schoolId: school.id,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roles: {
          create: {
            roleId: schoolAdminRole.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    try {
      const existingSub = await this.prisma.schoolSubscription.findFirst({
        where: { schoolId: school.id },
      });
      if (!existingSub) {
        let planId = (dto as any).planId;
        if (!planId) {
          const plan = await this.prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
          planId = plan ? plan.id : null;
        }

        if (planId) {
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 30);
          await this.prisma.schoolSubscription.create({
            data: {
              schoolId: school.id,
              planId,
              startDate,
              endDate,
              status: 'ACTIVE',
            },
          });
        }
      }
    } catch (e) {
      // Non-fatal
    }

    // Seed default grade scales + assessment config for the new school (non-fatal)
    try {
      await this.gradeScalesService.seedDefaultsForSchool(school.id);
    } catch (e) {
      // Non-fatal — school can configure manually if this fails
    }

    try {
      const verificationToken = uuidv4();      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      await (this.prisma as any).emailVerification.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt,
        },
      });

      await this.emailQueue.add('send', {
        to: user.email,
        subject: 'Verify your email',
        template: 'verify-email',
        data: {
          token: verificationToken,
          firstName: user.firstName,
        },
      });
    } catch (e) {
      // Non-fatal
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.schoolId,
      user.roles.map((ur) => ur.role.name),
      [],
    );

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: user.schoolId,
        },
        ...tokens,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      await this.auditLogsService
        .logAction(
          'unknown',
          'LOGIN_FAILED',
          'User',
          dto.email,
          undefined,
          undefined,
          ipAddress,
          userAgent,
        )
        .catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.auditLogsService
        .logAction(
          user.id,
          'LOGIN_FAILED',
          'User',
          dto.email,
          undefined,
          undefined,
          ipAddress,
          userAgent,
        )
        .catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.auditLogsService
        .logAction(
          user.id,
          'LOGIN_FAILED',
          'User',
          dto.email,
          undefined,
          undefined,
          ipAddress,
          userAgent,
        )
        .catch(() => {});
      throw new UnauthorizedException('Account is deactivated');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.schoolId,
      user.roles.map((ur) => ur.role.name),
      [],
    );

    await this.auditLogsService
      .logAction(user.id, 'LOGIN', 'User', user.id, undefined, undefined, ipAddress, userAgent)
      .catch(() => {});

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: user.schoolId,
          roles: user.roles.map((ur) => ur.role.name),
        },
        ...tokens,
      },
    };
  }

  async superAdminLogin(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.auditLogsService
        .logAction(
          user.id,
          'LOGIN_FAILED',
          'User',
          user.email,
          undefined,
          undefined,
          ipAddress,
          userAgent,
        )
        .catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const roleNames = user.roles.map((ur) => ur.role.name);

    if (!roleNames.includes('SUPER_ADMIN')) {
      await this.auditLogsService
        .logAction(
          user.id,
          'LOGIN_FAILED',
          'User',
          user.email,
          undefined,
          undefined,
          ipAddress,
          userAgent,
        )
        .catch(() => {});
      throw new ForbiddenException('Access denied. Super admin credentials required.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.schoolId, roleNames, []);

    await this.auditLogsService
      .logAction(user.id, 'LOGIN', 'User', user.id, undefined, undefined, ipAddress, userAgent)
      .catch(() => {});

    return {
      success: true,
      message: 'Super admin login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: user.schoolId,
          roles: roleNames,
        },
        ...tokens,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const userId = await this.validateRefreshTokenInRedis(dto.refreshToken);
    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (refreshToken.revokedAt) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    // Refresh token rotation:
    // 1. Revoke old token immediately
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    // 2. Remove old token from Redis
    await this.redisService.deleteRefreshToken(userId);

    // 3. Generate new token pair
    const tokens = await this.generateTokens(
      refreshToken.user.id,
      refreshToken.user.email,
      refreshToken.user.schoolId,
      [],
      [],
    );

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    };
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.redisService.deleteRefreshToken(userId);

    await this.auditLogsService
      .logAction(userId, 'LOGOUT', 'User', userId, undefined, undefined, ipAddress, userAgent)
      .catch(() => {});

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  async verifyEmail(token: string) {
    const verification = await (this.prisma as any).emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verification.usedAt) {
      throw new BadRequestException('Verification token already used');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      }),
      (this.prisma as any).emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password and revoke all existing refresh tokens (force re-login on other devices)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.redisService.deleteRefreshToken(userId);

    return {
      success: true,
      message: 'Password changed successfully. Please log in again if prompted.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return {
        success: true,
        message: 'If that email address is registered, you will receive a reset link shortly.',
      };
    }

    const resetToken = uuidv4();
    await this.redisService.storePasswordResetToken(resetToken, user.id);

    try {
      await this.emailQueue.add('send', {
        to: user.email,
        subject: 'Reset your GRADELLENCE password',
        template: 'reset-password',
        data: {
          token: resetToken,
          firstName: user.firstName,
        },
      });
    } catch {
      // Swallow — the token is stored so a future retry mechanism could resend.
    }

    return {
      success: true,
      message: 'If that email address is registered, you will receive a reset link shortly.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const userId = await this.redisService.getPasswordResetToken(token);

    if (!userId) {
      throw new BadRequestException('Password reset link is invalid or has expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('Password reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.redisService.deletePasswordResetToken(token);
    await this.redisService.deleteRefreshToken(userId);

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    schoolId: string,
    roles: string[] = [],
    permissions: string[] = [],
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      schoolId,
      roles,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const refreshTokenExpiration = new Date();
    refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: refreshTokenExpiration,
      },
    });

    await this.storeRefreshTokenInRedis(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    };
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.name),
    );

    return {
      id: user.id,
      email: user.email,
      schoolId: user.schoolId,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };
  }

  private async validateRefreshTokenInRedis(refreshToken: string): Promise<string | null> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      select: { userId: true },
    });

    if (!tokenRecord) {
      return null;
    }

    const storedToken = await this.redisService.getRefreshToken(tokenRecord.userId);
    return storedToken === refreshToken ? tokenRecord.userId : null;
  }

  private async storeRefreshTokenInRedis(userId: string, refreshToken: string): Promise<void> {
    await this.redisService.storeRefreshToken(userId, refreshToken);
  }

  private async deleteRefreshTokenFromRedis(userId: string): Promise<void> {
    await this.redisService.deleteRefreshToken(userId);
  }
}
