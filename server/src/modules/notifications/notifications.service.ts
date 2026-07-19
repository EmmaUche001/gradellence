import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const REDIS_PREFS_KEY = (userId: string) => `gradellence:notifications:prefs:${userId}`;

const DEFAULT_PREFERENCES = {
  RESULT_PUBLISHED: true,
  NEW_ASSESSMENT: true,
  ACCOUNT_ACTIVITY: true,
};

type NotificationType = 'RESULT_PUBLISHED' | 'NEW_ASSESSMENT' | 'ACCOUNT_ACTIVITY';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async sendNotification(userId: string, type: NotificationType, data: Record<string, any>) {
    const preferences = await this.getPreferences(userId);
    if (!preferences[type]) {
      return { sent: false, reason: 'disabled_by_preference' };
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let subject = 'Notification';
    let template = 'notification';

    if (type === 'RESULT_PUBLISHED') {
      subject = 'Results have been published';
      template = 'result-published';
    } else if (type === 'NEW_ASSESSMENT') {
      subject = 'New assessment available';
      template = 'new-assessment';
    } else if (type === 'ACCOUNT_ACTIVITY') {
      subject = 'Account activity notification';
      template = 'account-activity';
    }

    await this.emailQueue.add('send', {
      to: user.email,
      subject,
      template,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        ...data,
      },
    });

    return { sent: true };
  }

  async getPreferences(userId: string) {
    const raw = await this.redisService.get(REDIS_PREFS_KEY(userId));
    if (!raw) {
      return { ...DEFAULT_PREFERENCES };
    }
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  async updatePreferences(userId: string, dto: Partial<Record<NotificationType, boolean>>) {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...dto };
    await this.redisService.set(REDIS_PREFS_KEY(userId), JSON.stringify(updated));
    return updated;
  }
}
