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
      activeSession: activeSession ? { id: activeSession.id, name: activeSession.name } : null,
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

  // ── Enrollment history ──────────────────────────────────────────────────
  // Groups new enrollments by month/week for the enrollment trend chart.
  async getEnrollmentHistory(schoolId: string, period: '7d' | '30d' | '90d' | '1y' = '30d') {
    const now = new Date();
    const from = new Date(now);
    if (period === '7d') from.setDate(now.getDate() - 7);
    else if (period === '30d') from.setDate(now.getDate() - 30);
    else if (period === '90d') from.setDate(now.getDate() - 90);
    else from.setFullYear(now.getFullYear() - 1);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        student: { schoolId },
        createdAt: { gte: from },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Bucket by label depending on period
    const buckets = new Map<string, number>();

    const labelFor = (d: Date): string => {
      if (period === '7d' || period === '30d') {
        // Daily buckets: "Jun 1"
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
      // Monthly buckets: "Jun 2026"
      return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    };

    // Pre-fill all expected labels with 0 so the chart has no gaps
    if (period === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        buckets.set(labelFor(d), 0);
      }
    } else if (period === '30d') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        buckets.set(labelFor(d), 0);
      }
    } else if (period === '90d') {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        d.setDate(1);
        buckets.set(labelFor(d), 0);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        d.setDate(1);
        buckets.set(labelFor(d), 0);
      }
    }

    for (const e of enrollments) {
      const label = labelFor(new Date(e.createdAt));
      buckets.set(label, (buckets.get(label) ?? 0) + 1);
    }

    const labels = Array.from(buckets.keys());
    const data = Array.from(buckets.values());

    return {
      period,
      totalEnrollments: enrollments.length,
      labels,
      data,
    };
  }

  // ── Grade distribution ──────────────────────────────────────────────────
  // Returns a count of results per grade band (A/B/C/D/F) for a given term.
  async getGradeDistribution(schoolId: string, termId?: string) {
    const where: any = { schoolId, isPublished: true };
    if (termId) where.termId = termId;

    const results = await this.prisma.result.findMany({
      where,
      select: { totalScore: true, grade: true },
    });

    const total = results.length;

    // Use the school's configured grade scales to determine bands
    const gradeScales = await this.prisma.gradeScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { minScore: 'desc' },
    });

    // Build bands: Excellent (≥80), Good (60-79), Average (40-59), Needs Support (<40)
    const bands = [
      { name: 'Excellent (80-100%)', min: 80, max: 100, count: 0, color: '#2563EB' },
      { name: 'Good (60-79%)', min: 60, max: 79, count: 0, color: '#22C55E' },
      { name: 'Average (40-59%)', min: 40, max: 59, count: 0, color: '#F59E0B' },
      { name: 'Needs Support (<40%)', min: 0, max: 39, count: 0, color: '#EF4444' },
    ];

    for (const r of results) {
      const score = r.totalScore;
      const band = bands.find((b) => score >= b.min && score <= b.max);
      if (band) band.count++;
    }

    return {
      total,
      termId: termId ?? null,
      bands: bands.map((b) => ({
        name: b.name,
        count: b.count,
        percent: total > 0 ? Math.round((b.count / total) * 10000) / 100 : 0,
        color: b.color,
      })),
    };
  }
}
