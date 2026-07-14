import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const TRIAL_LIMITS: Record<string, number> = {
  students: 10,
  teachers: 2,
  classes: 2,
  subjects: 5,
};

const ENTITY_LABELS: Record<string, string> = {
  students: 'students',
  teachers: 'teachers',
  classes: 'classes',
  subjects: 'subjects',
};

/**
 * Enforces entity creation limits during free trial or active subscription.
 *
 * - If the school has an active subscription plan, uses that plan's limits.
 * - If no subscription exists (free trial), uses hardcoded TRIAL_LIMITS.
 * - Throws ForbiddenException if the limit would be exceeded.
 */
export async function enforceEntityLimit(
  prisma: PrismaService,
  entityType: 'students' | 'teachers' | 'classes' | 'subjects',
  schoolId: string,
): Promise<void> {
  const trialLimit = TRIAL_LIMITS[entityType];
  const label = ENTITY_LABELS[entityType];

  // Check if the school has an active paid subscription
  const subscription = await prisma.schoolSubscription.findFirst({
    where: { schoolId, status: 'ACTIVE' },
    include: { plan: true },
  });

  let maxLimit: number;

  if (subscription) {
    // Use plan limits
    switch (entityType) {
      case 'students':
        maxLimit = subscription.plan.maxStudents;
        break;
      case 'teachers':
        maxLimit = subscription.plan.maxUsers;
        break;
      case 'classes':
        // Plans don't have a maxClasses field yet; default to subscription or trial
        maxLimit = trialLimit;
        break;
      case 'subjects':
        // Plans don't have a maxSubjects field; skip check if subscribed
        return;
      default:
        maxLimit = trialLimit;
    }
  } else {
    // Free trial — use hardcoded limits
    maxLimit = trialLimit;
  }

  // Query current count
  let currentCount = 0;

  switch (entityType) {
    case 'students':
      currentCount = await prisma.student.count({
        where: { schoolId, deletedAt: null },
      });
      break;
    case 'teachers':
      currentCount = await prisma.teacher.count({
        where: { schoolId, deletedAt: null },
      });
      break;
    case 'classes':
      currentCount = await prisma.class.count({
        where: { schoolId, deletedAt: null },
      });
      break;
    case 'subjects':
      currentCount = await prisma.subject.count({
        where: { schoolId, deletedAt: null },
      });
      break;
  }

  if (currentCount >= maxLimit) {
    const message = subscription
      ? `Plan limit reached (${maxLimit} ${label}). Upgrade your plan to add more ${label}.`
      : `Free trial limit reached (${maxLimit} ${label}). Please choose a subscription plan to add more ${label}.`;
    throw new ForbiddenException(message);
  }
}
