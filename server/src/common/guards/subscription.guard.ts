import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';

export const SUBSCRIPTION_LIMIT_KEY = 'subscription_limit';
export const REQUIRED_FEATURE_KEY = 'required_feature';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitConfig = this.reflector.get<{ type: string; count: number }>(
      SUBSCRIPTION_LIMIT_KEY,
      context.getHandler(),
    );

    const requiredFeature = this.reflector.get<string>(REQUIRED_FEATURE_KEY, context.getHandler());

    if (!limitConfig && !requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super admins bypass subscription checks
    if (user?.roles?.includes('SUPER_ADMIN')) {
      return true;
    }

    const schoolId = user?.schoolId;

    if (!schoolId) {
      throw new ForbiddenException('School not identified');
    }

    // Get school's active subscription
    const subscription = await this.prisma.schoolSubscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    // Check subscription expiry
    if (new Date() > subscription.endDate) {
      await this.prisma.schoolSubscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });
      throw new ForbiddenException('Subscription has expired');
    }

    // Check feature gating
    if (requiredFeature) {
      const planFeatures = subscription.plan.features as Record<string, boolean>;
      if (!planFeatures?.[requiredFeature]) {
        throw new ForbiddenException(
          `Feature '${requiredFeature}' is not available on your ${subscription.plan.name} plan`,
        );
      }
    }

    // Check subscription limits
    if (limitConfig) {
      const { type } = limitConfig;

      if (type === 'students') {
        const count = await this.prisma.student.count({
          where: { schoolId, deletedAt: null },
        });
        if (count >= subscription.plan.maxStudents) {
          throw new ForbiddenException(
            `Student limit reached (${subscription.plan.maxStudents}). Upgrade your plan to add more students.`,
          );
        }
      }

      if (type === 'users') {
        const count = await this.prisma.user.count({
          where: { schoolId, deletedAt: null },
        });
        if (count >= subscription.plan.maxUsers) {
          throw new ForbiddenException(
            `User limit reached (${subscription.plan.maxUsers}). Upgrade your plan to add more users.`,
          );
        }
      }

      if (type === 'classes') {
        const count = await this.prisma.class.count({
          where: { schoolId, deletedAt: null },
        });
        if (count >= subscription.plan.maxBranches) {
          throw new ForbiddenException(
            `Class/Branch limit reached (${subscription.plan.maxBranches}). Upgrade your plan to add more.`,
          );
        }
      }
    }

    return true;
  }
}
