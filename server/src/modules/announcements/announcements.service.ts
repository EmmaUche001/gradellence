import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAnnouncementDto, currentUser: AuthenticatedUser) {
    const announcement = await this.prisma.announcement.create({
      data: {
        schoolId: currentUser.schoolId,
        title: dto.title,
        body: dto.body ?? null,
        date: new Date(dto.date),
        createdBy: currentUser.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      success: true,
      message: 'Announcement created',
      data: announcement,
    };
  }

  async findAll(currentUser: AuthenticatedUser, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where: { schoolId: currentUser.schoolId },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.announcement.count({
        where: { schoolId: currentUser.schoolId },
      }),
    ]);

    return {
      success: true,
      message: 'Announcements retrieved',
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, schoolId: currentUser.schoolId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!announcement) throw new NotFoundException('Announcement not found');

    return { success: true, message: 'Announcement retrieved', data: announcement };
  }

  async update(id: string, dto: UpdateAnnouncementDto, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, schoolId: currentUser.schoolId },
    });

    if (!existing) throw new NotFoundException('Announcement not found');

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return { success: true, message: 'Announcement updated', data: updated };
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, schoolId: currentUser.schoolId },
    });

    if (!existing) throw new NotFoundException('Announcement not found');

    await this.prisma.announcement.delete({ where: { id } });

    return { success: true, message: 'Announcement deleted' };
  }
}
