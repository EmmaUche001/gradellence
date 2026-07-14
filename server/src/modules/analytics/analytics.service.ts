import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/types/express.types';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(schoolId: string) {
    const [totalStudents, totalTeachers, totalClasses, totalSubjects, activeSession, currentTerm] =
      await Promise.all([
        this.prisma.student.count({ where: { schoolId, deletedAt: null } }),
        this.prisma.teacher.count({ where: { schoolId, deletedAt: null } }),
        this.prisma.class.count({ where: { schoolId, deletedAt: null } }),
        this.prisma.subject.count({ where: { schoolId, deletedAt: null } }),
        this.prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
        this.prisma.term.findFirst({ where: { schoolId, isCurrent: true } }),
      ]);

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      activeSession: activeSession
        ? { id: activeSession.id, name: activeSession.name }
        : null,
      currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null,
    };
  }

  async getResultStats(schoolId: string, termId?: string) {
    const where: any = { schoolId };
    if (termId) where.termId = termId;

    const [totalResults, publishedResults, passCount, grouped] = await Promise.all([
      this.prisma.result.count({ where }),
      this.prisma.result.count({ where: { ...where, isPublished: true } }),
      this.prisma.result.count({ where: { ...where, totalScore: { gte: 50 } } }),
      this.prisma.result.groupBy({
        by: ['subjectId'],
        where,
        _avg: { totalScore: true },
        _count: { _all: true },
      }),
    ]);

    const subjectIds = grouped.map((g) => g.subjectId);
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds }, schoolId },
      select: { id: true, name: true },
    });

    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const passCounts = await this.prisma.result.groupBy({
      by: ['subjectId'],
      where: { ...where, totalScore: { gte: 50 } },
      _count: { _all: true },
    });
    const passCountMap = new Map(passCounts.map((p) => [p.subjectId, p._count._all]));

    const subjectPerformance = grouped.map((g) => {
      const subjectName = subjectMap.get(g.subjectId) || 'Unknown';
      const averageScore = g._avg.totalScore || 0;
      const subjectTotal = g._count._all || 0;
      const subjectPass = passCountMap.get(g.subjectId) || 0;
      const passRate = subjectTotal > 0 ? subjectPass / subjectTotal : 0;
      return {
        subjectId: g.subjectId,
        subjectName,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 10000) / 100,
      };
    });

    const passRate = totalResults > 0 ? (passCount / totalResults) * 100 : 0;

    const averageScoreRow = await this.prisma.result.aggregate({
      where,
      _avg: { totalScore: true },
    });

    return {
      totalResults,
      publishedResults,
      passRate: Math.round(passRate * 100) / 100,
      averageScore: Math.round((averageScoreRow._avg.totalScore || 0) * 100) / 100,
      subjectPerformance,
    };
  }

  async getClassRankings(schoolId: string, classId: string, termId: string) {
    const classEntity = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, deletedAt: null },
    });
    if (!classEntity) {
      throw new Error('Class not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, termId, student: { schoolId } },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true },
        },
      },
      orderBy: { student: { firstName: 'asc' } },
    });

    const studentIds = enrollments.map((e) => e.studentId);
    const results = await this.prisma.result.findMany({
      where: { studentId: { in: studentIds }, termId, schoolId },
      include: { subject: { select: { id: true, name: true, code: true } } },
    });

    const subjectIds = [...new Set(results.map((r) => r.subjectId))];
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds }, schoolId },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    const broadsheetData = enrollments.map((enrollment) => {
      const studentResults = results.filter((r) => r.studentId === enrollment.studentId);
      let totalScore = 0;
      for (const subject of subjects) {
        const result = studentResults.find((r) => r.subjectId === subject.id);
        if (result) totalScore += result.totalScore;
      }
      const averageScore = subjects.length > 0 ? totalScore / subjects.length : 0;
      return {
        student: enrollment.student,
        totalScore: Math.round(totalScore * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
      };
    });

    broadsheetData.sort((a, b) => b.averageScore - a.averageScore);

    return broadsheetData.slice(0, 10).map((row, idx) => ({
      position: idx + 1,
      studentId: row.student.id,
      firstName: row.student.firstName,
      lastName: row.student.lastName,
      admissionNumber: row.student.admissionNumber,
      totalScore: row.totalScore,
      averageScore: row.averageScore,
    }));
  }
}