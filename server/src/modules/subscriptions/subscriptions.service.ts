import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPlan(dto: CreatePlanDto) {
    const existing = await this.prisma.subscriptionPlan.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Plan "${dto.name}" already exists`);
    }

    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        priceNGN: dto.price,
        duration: dto.duration,
        maxStudents: dto.maxStudents,
        maxUsers: dto.maxTeachers,
        maxBranches: dto.maxClasses,
        features: dto.features || {},
      },
    });
  }

  async seedDefaultPlans() {
    const existingCount = await this.prisma.subscriptionPlan.count();
    if (existingCount > 0) {
      return {
        message: `${existingCount} plan(s) already exist. No action taken.`,
        count: existingCount,
      };
    }

    const defaults = [
      {
        name: 'Basic',
        description: 'Perfect for small private schools and nursery schools',
        priceNGN: 15000,
        duration: 30,
        maxStudents: 500,
        maxUsers: 50,
        maxBranches: 1,
        storageGB: 10,
        features: {
          aiRemarks: false,
          aiStudentSummary: false,
          aiTeacherInsights: false,
          aiAcademicAdvisor: false,
          aiRiskPrediction: false,
          aiForecasting: false,
          aiChatAssistant: false,
          aiExecutiveReports: false,
          parentPortal: false,
          communication: false,
          analyticsDashboard: true,
          multiBranch: false,
          bulkOperations: false,
        },
      },
      {
        name: 'Standard',
        description: 'Ideal for growing schools with multiple classes',
        priceNGN: 50000,
        duration: 30,
        maxStudents: 2000,
        maxUsers: 200,
        maxBranches: 3,
        storageGB: 50,
        features: {
          aiRemarks: true,
          aiStudentSummary: true,
          aiTeacherInsights: true,
          aiAcademicAdvisor: false,
          aiRiskPrediction: false,
          aiForecasting: false,
          aiChatAssistant: false,
          aiExecutiveReports: false,
          parentPortal: true,
          communication: true,
          analyticsDashboard: true,
          multiBranch: true,
          bulkOperations: true,
        },
      },
      {
        name: 'Premium',
        description: 'For large institutions requiring unlimited access',
        priceNGN: 150000,
        duration: 30,
        maxStudents: 999999,
        maxUsers: 999999,
        maxBranches: 999999,
        storageGB: 999999,
        features: {
          aiRemarks: true,
          aiStudentSummary: true,
          aiTeacherInsights: true,
          aiAcademicAdvisor: true,
          aiRiskPrediction: true,
          aiForecasting: true,
          aiChatAssistant: true,
          aiExecutiveReports: true,
          parentPortal: true,
          communication: true,
          analyticsDashboard: true,
          multiBranch: true,
          bulkOperations: true,
        },
      },
    ];

    const created = await this.prisma.subscriptionPlan.createMany({
      data: defaults,
    });

    return { message: `Created ${created.count} default plans`, count: created.count };
  }

  async findAllPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceNGN: 'asc' },
    });
  }

  async findOnePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { priceNGN: dto.price }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.maxStudents !== undefined && { maxStudents: dto.maxStudents }),
        ...(dto.maxTeachers !== undefined && { maxUsers: dto.maxTeachers }),
        ...(dto.maxClasses !== undefined && { maxBranches: dto.maxClasses }),
        ...(dto.features !== undefined && { features: dto.features }),
      },
    });
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Plan deactivated successfully' };
  }

  async subscribe(schoolId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    let proratedCredit = 0;
    const existingActive = await this.prisma.schoolSubscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      include: { plan: true },
    });

    if (existingActive && existingActive.planId !== planId) {
      const totalMs = existingActive.endDate.getTime() - existingActive.startDate.getTime();
      const remainingMs = existingActive.endDate.getTime() - now.getTime();
      const remainingFraction = Math.max(0, remainingMs / totalMs);
      proratedCredit = Math.round(existingActive.plan.priceNGN * remainingFraction);

      await this.prisma.schoolSubscription.update({
        where: { id: existingActive.id },
        data: { status: 'CANCELLED', cancelledAt: now, proratedCredit },
      });
    }

    const startDate = now;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);
    const amountDue = Math.max(0, plan.priceNGN - proratedCredit);

    const subscription = await this.prisma.schoolSubscription.create({
      data: {
        schoolId,
        planId,
        startDate,
        endDate,
        status: 'ACTIVE',
        autoRenew: true,
        proratedCredit,
      },
      include: { plan: true },
    });

    if (amountDue > 0) {
      await this.prisma.invoice.create({
        data: {
          schoolId,
          subscriptionId: subscription.id,
          amount: amountDue,
          currency: 'NGN',
          dueDate: endDate,
          description:
            `${plan.name} plan subscription` +
            (proratedCredit > 0 ? ` (prorated credit: ₦${proratedCredit.toLocaleString()})` : ''),
        },
      });
    }

    return subscription;
  }

  async getCurrentSubscription(schoolId: string) {
    const subscription = await this.prisma.schoolSubscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return subscription;
  }

  async cancelSubscription(schoolId: string) {
    const subscription = await this.prisma.schoolSubscription.findFirst({
      where: { schoolId, status: 'ACTIVE' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return this.prisma.schoolSubscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED', autoRenew: false, cancelledAt: new Date() },
    });
  }

  async assignTrial(schoolId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

    return this.prisma.schoolSubscription.create({
      data: {
        schoolId,
        planId,
        startDate: trialStart,
        endDate: trialEnd,
        status: 'TRIAL',
        autoRenew: false,
        trialEndsAt: trialEnd,
      },
      include: { plan: true },
    });
  }
}
