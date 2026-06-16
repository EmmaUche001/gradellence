import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from '../../common/types/express.types';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const passwordHash = await argon2.hash(dto.password);

    // Normalize school alias into a safe slug and ensure uniqueness using upsert to avoid race conditions.
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
      // In the unlikely event of a race condition or unique constraint error,
      // fall back to finding the existing school and rethrow if not found.
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

    // Create user
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

    // Auto-create default trial subscription if none exists (non-fatal)
    try {
      const existingSub = await this.prisma.schoolSubscription.findFirst({
        where: { schoolId: school.id },
      });
      if (!existingSub) {
        // Prefer planId from DTO, otherwise pick any available plan
        let planId = (dto as any).planId;
        if (!planId) {
          const plan = await this.prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
          planId = plan ? plan.id : null;
        }

        if (planId) {
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 30); // 30-day trial
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
      // Non-fatal: do not block registration on subscription creation errors
    }

    // Create email verification token and enqueue verification email
    try {
      const verificationToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours

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
      // Non-fatal: if email queue or verification creation fails, log and continue registration.
      // Let higher-level observability capture this; user can request resend later.
      // (We intentionally do not block user creation for transient email/queue issues.)
      // swallow error
    }

    // Generate tokens
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

  async login(dto: LoginDto) {
    // Find user
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

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.schoolId,
      user.roles.map((ur) => ur.role.name),
      [],
    );

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

  async refreshToken(dto: RefreshTokenDto) {
    // Validate refresh token in Redis (primary check)
    const userId = await this.validateRefreshTokenInRedis(dto.refreshToken);
    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find refresh token in DB (secondary check for metadata)
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if token is revoked
    if (refreshToken.revokedAt) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    // Revoke old refresh token in DB
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    // Delete from Redis
    await this.redisService.deleteRefreshToken(userId);

    // Generate new tokens
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

  async logout(userId: string) {
    // Revoke all refresh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Delete from Redis
    await this.redisService.deleteRefreshToken(userId);

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

    // Mark user's email as verified and mark verification record as used
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

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user not found (security best practice)
      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Implementation for sending password reset email
    // This would typically involve generating a reset token and sending an email
    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Implementation for password reset
    // This would typically involve verifying the reset token and updating the password
    throw new BadRequestException('Password reset not implemented yet');
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

    // Generate refresh token
    const refreshToken = uuidv4();
    const refreshTokenExpiration = new Date();
    refreshTokenExpiration.setDate(
      refreshTokenExpiration.getDate() + 7, // 7 days
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: refreshTokenExpiration,
      },
    });

    // Store refresh token in Redis
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

  /**
   * Validate refresh token exists in Redis and return userId
   */
  private async validateRefreshTokenInRedis(refreshToken: string): Promise<string | null> {
    // We need to find the userId by checking all refresh tokens
    // Since Redis keys are by userId, we'd need a reverse lookup
    // For now, we'll check the token in DB and then verify in Redis
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

  /**
   * Store refresh token in Redis
   */
  private async storeRefreshTokenInRedis(userId: string, refreshToken: string): Promise<void> {
    await this.redisService.storeRefreshToken(userId, refreshToken);
  }

  /**
   * Delete refresh token from Redis
   */
  private async deleteRefreshTokenFromRedis(userId: string): Promise<void> {
    await this.redisService.deleteRefreshToken(userId);
  }
}
