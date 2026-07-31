import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type NotificationType =
  | 'RESULT_PUBLISHED'
  | 'ASSIGNMENT'
  | 'ANNOUNCEMENT'
  | 'ROLE_CHANGED'
  | 'SYSTEM';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create a single notification ────────────────────────────────────────
  async create(params: {
    userId: string;
    schoolId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }) {
    return this.prisma.notification.create({ data: params });
  }

  // ── Create notifications for multiple users at once ──────────────────────
  async createMany(params: {
    userIds: string[];
    schoolId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }) {
    const { userIds, ...rest } = params;
    if (userIds.length === 0) return;
    await this.prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, ...rest })),
      skipDuplicates: true,
    });
  }

  // ── Notify all active users in a school ───────────────────────────────────
  async notifySchool(params: {
    schoolId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    excludeUserId?: string;
  }) {
    const { schoolId, excludeUserId, ...notifData } = params;
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        deletedAt: null,
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return;
    await this.prisma.notification.createMany({
      data: userIds.map(userId => ({ userId, schoolId, ...notifData })),
      skipDuplicates: true,
    });
  }

  // ── Get inbox for a user ────────────────────────────────────────────────
  async getInbox(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return {
      success: true,
      data: notifications,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Unread count ────────────────────────────────────────────────────────
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { success: true, data: { count } };
  }

  // ── Mark single notification as read ────────────────────────────────────
  async markRead(userId: string, notificationId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return { success: true, message: 'Marked as read' };
  }

  // ── Mark all as read ────────────────────────────────────────────────────
  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, message: 'All notifications marked as read' };
  }
}
