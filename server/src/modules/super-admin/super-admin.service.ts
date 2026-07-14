import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Schools ──────────────────────────────────────────

  async findAllSchools(page: number, limit: number, search?: string, status?: string) {
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'INACTIVE') where.isActive = false;

    const [data, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, students: true, teachers: true } },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findSchoolById(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, students: true, teachers: true } },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async suspendSchool(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    return this.prisma.school.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reactivateSchool(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    return this.prisma.school.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deleteSchool(id: string) {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');

    return this.prisma.school.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Platform Analytics ──────────────────────────────

  async getPlatformStats() {
    const [
      totalSchools,
      activeSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
      subscriptions,
    ] = await Promise.all([
      this.prisma.school.count({ where: { deletedAt: null } }),
      this.prisma.school.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.student.count({ where: { deletedAt: null } }),
      this.prisma.teacher.count({ where: { deletedAt: null } }),
      this.prisma.schoolSubscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
    ]);

    const totalRevenue = subscriptions.reduce(
      (sum, sub) => sum + sub.plan.priceNGN,
      0,
    );

    const monthlyRecurringRevenue = subscriptions.reduce((sum, sub) => {
      const months = Math.max(1, sub.plan.duration / 30);
      return sum + sub.plan.priceNGN / months;
    }, 0);

    return {
      totalSchools,
      activeSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalRevenue,
      activeSubscriptions: subscriptions.length,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue),
    };
  }

  async getRevenueStats(period: string) {
    const now = new Date();
    let startDate: Date;
    let interval: 'day' | 'week' | 'month';

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = 'day';
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        interval = 'week';
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        interval = 'month';
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = 'day';
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'PAID',
        paidAt: { gte: startDate },
      },
      orderBy: { paidAt: 'asc' },
    });

    const subscriptions = await this.prisma.schoolSubscription.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by interval
    const labels: string[] = [];
    const revenue: number[] = [];
    const subCounts: number[] = [];

    const formatDate = (date: Date) => {
      if (interval === 'day') return date.toISOString().slice(0, 10);
      if (interval === 'week') {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay());
        return start.toISOString().slice(0, 10);
      }
      return date.toISOString().slice(0, 7);
    };

    const revenueMap = new Map<string, number>();
    const subMap = new Map<string, number>();

    for (const inv of invoices) {
      const key = formatDate(new Date(inv.paidAt!));
      revenueMap.set(key, (revenueMap.get(key) || 0) + inv.amount);
    }

    for (const sub of subscriptions) {
      const key = formatDate(new Date(sub.createdAt));
      subMap.set(key, (subMap.get(key) || 0) + 1);
    }

    // Build time series
    const cursor = new Date(startDate);
    while (cursor <= now) {
      const key = formatDate(cursor);
      labels.push(key);
      revenue.push(revenueMap.get(key) || 0);
      subCounts.push(subMap.get(key) || 0);

      if (interval === 'day') cursor.setDate(cursor.getDate() + 1);
      else if (interval === 'week') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }

    return { labels, revenue, subscriptions: subCounts };
  }
}