import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvoice(dto: CreateInvoiceDto) {
    // Verify school exists
    const school = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
    });
    if (!school) throw new NotFoundException('School not found');

    // If subscriptionId provided, verify it belongs to school
    if (dto.subscriptionId) {
      const subscription = await this.prisma.schoolSubscription.findFirst({
        where: { id: dto.subscriptionId, schoolId: dto.schoolId },
      });
      if (!subscription) throw new NotFoundException('Subscription not found for this school');
    }

    return this.prisma.invoice.create({
      data: {
        schoolId: dto.schoolId,
        subscriptionId: dto.subscriptionId || null,
        amount: dto.amount,
        currency: dto.currency || 'NGN',
        dueDate: new Date(dto.dueDate),
        description: dto.description || '',
      },
    });
  }

  async getInvoices(schoolId: string, status?: string) {
    return this.prisma.invoice.findMany({
      where: {
        schoolId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async payInvoice(id: string, paymentRef: string, paymentMethod: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentRef,
        paymentMethod,
        paidAt: new Date(),
      },
    });
  }

  async failInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'FAILED' },
    });
  }
}