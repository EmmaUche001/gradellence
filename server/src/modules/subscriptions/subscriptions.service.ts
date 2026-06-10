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

    // Deactivate existing active subscriptions
    await this.prisma.schoolSubscription.updateMany({
      where: { schoolId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.duration);

    const subscription = await this.prisma.schoolSubscription.create({
      data: {
        schoolId,
        planId,
        startDate,
        endDate,
        status: 'ACTIVE',
        autoRenew: true,
      },
      include: { plan: true },
    });

    // Create invoice
    await this.prisma.invoice.create({
      data: {
        schoolId,
        subscriptionId: subscription.id,
        amount: plan.priceNGN,
        currency: 'NGN',
        dueDate: endDate,
        description: `${plan.name} plan subscription`,
      },
    });

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