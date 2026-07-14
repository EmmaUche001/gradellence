import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { ParentRegisterDto } from './dto/parent-register.dto';
import { ParentLoginDto } from './dto/parent-login.dto';

@Injectable()
export class ParentsService {
  private readonly logger = new Logger(ParentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: ParentRegisterDto) {
    const school = await this.prisma.school.findUnique({
      where: { slug: dto.schoolSlug },
    });
    if (!school) throw new BadRequestException('School not found');

    const student = await this.prisma.student.findFirst({
      where: { admissionNumber: dto.admissionNumber, schoolId: school.id },
    });
    if (!student) throw new BadRequestException('Student not found with that admission number');

    if (student.parentEmail !== dto.email) {
      throw new BadRequestException('Email does not match the student record');
    }

    const existing = await this.prisma.parent.findFirst({
      where: { schoolId: school.id, email: dto.email },
    });

    if (existing) {
      const alreadyLinked = await this.prisma.studentParent.findUnique({
        where: { studentId_parentId: { studentId: student.id, parentId: existing.id } },
      });
      if (!alreadyLinked) {
        await this.prisma.studentParent.create({
          data: { parentId: existing.id, studentId: student.id },
        });
      }
      return { message: 'Linked to existing account. Please log in.' };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const parent = await this.prisma.parent.create({
      data: {
        schoolId: school.id,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || '',
        students: { create: { studentId: student.id } },
      },
    });

    return {
      message: 'Parent registered successfully',
      parentId: parent.id,
    };
  }

  async login(dto: ParentLoginDto) {
    const parent = await this.prisma.parent.findFirst({
      where: { email: dto.email },
    });

    if (!parent) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, parent.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (!parent.isActive) throw new UnauthorizedException('Account is deactivated');

    await this.prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens(parent);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      parent: {
        id: parent.id,
        email: parent.email,
        firstName: parent.firstName,
        lastName: parent.lastName,
        schoolId: parent.schoolId,
      },
    };
  }

  async getStudents(parentId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        students: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: { class: true, term: { include: { session: true } } },
                },
                results: {
                  where: { isPublished: true },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!parent) throw new NotFoundException('Parent not found');

    return parent.students.map((sp: any) => ({
      id: sp.student.id,
      firstName: sp.student.firstName,
      lastName: sp.student.lastName,
      admissionNumber: sp.student.admissionNumber,
      currentClass: sp.student.enrollments[0]?.class?.name || null,
      currentTerm: sp.student.enrollments[0]?.term?.name || null,
      latestAverage: sp.student.results[0]?.totalScore || null,
    }));
  }

  async getStudentResults(parentId: string, studentId: string) {
    await this.verifyParentOwnsStudent(parentId, studentId);

    const results = await this.prisma.result.findMany({
      where: { studentId, isPublished: true },
      include: { subject: true, term: { include: { session: true } } },
      orderBy: [{ term: { session: { name: 'asc' as const } } }, { subject: { name: 'asc' as const } }],
    });

    return results.map((r: any) => ({
      subject: r.subject.name,
      score: r.totalScore,
      grade: r.grade,
      remark: r.remark,
      term: r.term.name,
      session: r.term.session.name,
    }));
  }

  async getStudentAnalytics(parentId: string, studentId: string) {
    await this.verifyParentOwnsStudent(parentId, studentId);

    const results = await this.prisma.result.findMany({
      where: { studentId, isPublished: true },
      include: { subject: true, term: { include: { session: true } } },
    });

    const byTerm = new Map<string, { total: number; count: number }>();
    for (const r of results) {
      const key = `${r.term.session.name} - ${r.term.name}`;
      const entry = byTerm.get(key) || { total: 0, count: 0 };
      entry.total += r.totalScore;
      entry.count++;
      byTerm.set(key, entry);
    }

    return {
      studentId,
      termAverages: Array.from(byTerm.entries()).map(([term, data]) => ({
        term,
        average: data.count > 0 ? data.total / data.count : 0,
        subjects: data.count,
      })),
      totalSubjects: results.length,
    };
  }

  private async verifyParentOwnsStudent(parentId: string, studentId: string) {
    const link = await this.prisma.studentParent.findUnique({
      where: { studentId_parentId: { studentId, parentId } },
    });
    if (!link) throw new ForbiddenException('You do not have access to this student');
  }

  private generateTokens(parent: { id: string; email: string; schoolId: string }) {
    const payload = { sub: parent.id, email: parent.email, schoolId: parent.schoolId, type: 'parent' };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });
    const refreshToken = uuidv4();
    return { accessToken, refreshToken };
  }
}