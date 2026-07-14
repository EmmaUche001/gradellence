import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class VerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  generateHash(type: string, entityId: string, schoolId: string): string {
    const secret = this.configService.get('VERIFICATION_SECRET', 'gradellence-verify-secret');
    return crypto
      .createHash('sha256')
      .update(`${type}:${entityId}:${schoolId}:${secret}`)
      .digest('hex');
  }

  async createVerification(params: {
    documentType: string;
    entityId: string;
    schoolId: string;
    studentId?: string;
    studentName?: string;
    termId?: string;
  }): Promise<{ hash: string; qrDataUrl: string }> {
    const { documentType, entityId, schoolId, studentId, studentName, termId } = params;
    const hash = this.generateHash(documentType, entityId, schoolId);

    await this.prisma.documentVerification.upsert({
      where: { hash },
      update: {},
      create: {
        hash,
        documentType,
        entityId,
        schoolId,
        studentId,
        studentName,
        termId,
      },
    });

    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
    const verifyUrl = `${frontendUrl}/verify/${hash}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    return { hash, qrDataUrl };
  }

  async verifyDocument(hash: string) {
    const record = await this.prisma.documentVerification.findUnique({
      where: { hash },
      include: {
        school: { select: { name: true, logo: true } },
      },
    });

    if (!record) {
      return null;
    }

    await this.prisma.documentVerification.update({
      where: { id: record.id },
      data: {
        verifiedAt: record.verifiedAt ?? new Date(),
        verifiedCount: { increment: 1 },
      },
    });

    return {
      valid: true,
      documentType: record.documentType,
      schoolName: record.school.name,
      schoolLogo: record.school.logo,
      studentName: record.studentName,
      termId: record.termId,
      verifiedCount: record.verifiedCount + 1,
      firstVerifiedAt: record.verifiedAt,
      createdAt: record.createdAt,
    };
  }
}