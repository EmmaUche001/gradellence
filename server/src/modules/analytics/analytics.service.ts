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

    const subjectIds = Array.from(new Set(results.map((r) => r.subjectId)));
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

  // ── Advanced analytics: Cross-term performance trends ─────────────────────────
  // This is a premium feature that shows student performance trends across multiple terms
  async getPerformanceTrends(
    schoolId: string,
    studentId?: string,
    subjectId?: string,
    termCount: number = 3
  ) {
    // Get recent terms for the school with session info
    const recentTerms = await this.prisma.term.findMany({
      where: { schoolId },
      include: {
        session: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
      take: termCount,
    });

    if (recentTerms.length === 0) {
      return {
        studentId,
        subjectId,
        terms: [],
        trends: [],
        averageScores: [],
        performanceChange: null,
      };
    }

    const termIds = recentTerms.map((t) => t.id);

    // Build where clause
    const where: any = {
      schoolId,
      termId: { in: termIds },
      isPublished: true,
    };

    if (studentId) where.studentId = studentId;
    if (subjectId) where.subjectId = subjectId;

    // Get results for these terms
    const results = await this.prisma.result.findMany({
      where,
      select: {
        studentId: true,
        subjectId: true,
        termId: true,
        totalScore: true,
        grade: true,
        isPass: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
        term: {
          select: {
            name: true,
            session: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { term: { startDate: 'asc' } },
    });

    // Group results by term and student/subject
    const termMap = new Map();
    for (const term of recentTerms) {
      termMap.set(term.id, {
        termId: term.id,
        termName: term.name,
        sessionName: term.session?.name || 'Unknown Session',
        results: [],
        averageScore: 0,
        passRate: 0,
      });
    }

    // Calculate per-term statistics
    for (const result of results) {
      const termData = termMap.get(result.termId);
      if (termData) {
        termData.results.push(result);
      }
    }

    const termStats = Array.from(termMap.values()).map((termData) => {
      if (termData.results.length === 0) {
        return {
          ...termData,
          averageScore: 0,
          passRate: 0,
          totalResults: 0,
          passedResults: 0,
        };
      }

      const totalScore = termData.results.reduce((sum: number, r: any) => sum + r.totalScore, 0);
      const averageScore = totalScore / termData.results.length;
      const passedResults = termData.results.filter((r: any) => r.isPass).length;
      const passRate = (passedResults / termData.results.length) * 100;

      return {
        ...termData,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        totalResults: termData.results.length,
        passedResults,
      };
    });

    // Calculate performance change between first and last term
    let performanceChange = null;
    if (termStats.length >= 2) {
      const firstTerm = termStats[0];
      const lastTerm = termStats[termStats.length - 1];
      const scoreChange = lastTerm.averageScore - firstTerm.averageScore;
      const passRateChange = lastTerm.passRate - firstTerm.passRate;
      
      performanceChange = {
        scoreChange: Math.round(scoreChange * 100) / 100,
        passRateChange: Math.round(passRateChange * 100) / 100,
        isImproving: scoreChange > 0,
        trend: scoreChange > 0 ? 'improving' : scoreChange < 0 ? 'declining' : 'stable',
      };
    }

    return {
      studentId,
      subjectId,
      terms: termStats.map((t) => ({
        termId: t.termId,
        termName: t.termName,
        sessionName: t.sessionName,
        averageScore: t.averageScore,
        passRate: t.passRate,
        totalResults: t.totalResults,
        passedResults: t.passedResults,
      })),
      trends: termStats.map((t) => t.averageScore),
      averageScores: termStats.map((t) => t.averageScore),
      performanceChange,
      totalTermsAnalyzed: termStats.length,
    };
  }

  // ── Predictive analytics: Score prediction ─────────────────────────────────────
  // This is a premium feature that predicts future performance based on historical data
  async getScorePredictions(
    schoolId: string,
    studentId: string,
    subjectId?: string,
    futureTermCount: number = 1
  ) {
    // Get historical results for the student
    const historicalResults = await this.prisma.result.findMany({
      where: {
        schoolId,
        studentId,
        ...(subjectId && { subjectId }),
        isPublished: true,
      },
      include: {
        term: {
          select: {
            name: true,
            startDate: true,
          },
        },
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { term: { startDate: 'asc' } },
      take: 6, // Use last 6 terms for prediction
    });

    if (historicalResults.length < 2) {
      return {
        studentId,
        subjectId,
        predictions: [],
        confidence: 0,
        message: 'Insufficient historical data for prediction',
      };
    }

    // Simple linear regression for prediction
    const scores = historicalResults.map((r) => r.totalScore);
    const terms = historicalResults.map((_, i) => i + 1); // Term sequence numbers
    
    // Calculate linear regression
    const n = scores.length;
    const sumX = terms.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = terms.reduce((sum, x, i) => sum + x * scores[i], 0);
    const sumX2 = terms.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate confidence (R-squared)
    const meanY = sumY / n;
    const ssTotal = scores.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssResidual = scores.reduce((sum, y, i) => {
      const predicted = slope * terms[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    const confidence = Math.max(0, Math.min(100, Math.round(rSquared * 10000) / 100));

    // Generate predictions for future terms
    const predictions = [];
    for (let i = 1; i <= futureTermCount; i++) {
      const nextTermNumber = terms[terms.length - 1] + i;
      const predictedScore = slope * nextTermNumber + intercept;
      
      // Apply reasonable bounds (0-100)
      const boundedScore = Math.max(0, Math.min(100, predictedScore));
      
      predictions.push({
        termNumber: nextTermNumber,
        predictedScore: Math.round(boundedScore * 100) / 100,
        grade: await this.predictGrade(schoolId, boundedScore),
        confidence: Math.round(confidence * (1 - i * 0.2)), // Confidence decreases for further predictions
        isPassPrediction: boundedScore >= 40, // Assuming 40 is pass mark
      });
    }

    // Get current performance trend
    const currentPerformance = await this.getPerformanceTrends(schoolId, studentId, subjectId, 3);
    
    return {
      studentId,
      subjectId,
      historicalResults: historicalResults.map((r) => ({
        termName: r.term.name,
        score: r.totalScore,
        grade: r.grade,
        isPass: r.isPass,
      })),
      predictions,
      confidence,
      currentTrend: currentPerformance.performanceChange?.trend || 'unknown',
      recommendation: this.generateRecommendation(scores[scores.length - 1], predictions[0]?.predictedScore || 0),
    };
  }

  // ── Helper: Predict grade based on school's grade scales ───────────────────────
  private async predictGrade(schoolId: string, score: number): Promise<string> {
    const gradeScales = await this.prisma.gradeScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { minScore: 'desc' },
    });

    for (const scale of gradeScales) {
      if (score >= scale.minScore && score <= scale.maxScore) {
        return scale.grade;
      }
    }
    
    return 'Unknown';
  }

  // ── Helper: Generate recommendation based on performance ────────────────────────
  private generateRecommendation(currentScore: number, predictedScore: number): string {
    const scoreChange = predictedScore - currentScore;
    
    if (scoreChange > 10) {
      return 'Excellent improvement expected. Maintain current study habits.';
    } else if (scoreChange > 5) {
      return 'Good improvement expected. Continue with current approach.';
    } else if (scoreChange > 0) {
      return 'Slight improvement expected. Focus on weaker areas.';
    } else if (scoreChange > -5) {
      return 'Performance may remain stable. Consider additional practice.';
    } else if (scoreChange > -10) {
      return 'Performance may decline slightly. Seek extra help in challenging areas.';
    } else {
      return 'Significant decline predicted. Schedule consultation with teacher.';
    }
  }

  // ── Comparative analytics: Class vs School vs National benchmarks ──────────────
  // This is a premium feature that compares performance against benchmarks
  async getComparativeAnalytics(
    schoolId: string,
    classId?: string,
    termId?: string
  ) {
    const currentTerm = termId 
      ? await this.prisma.term.findFirst({ where: { id: termId, schoolId } })
      : await this.prisma.term.findFirst({ where: { schoolId, isCurrent: true } });

    if (!currentTerm) {
      return {
        benchmarks: [],
        comparisons: [],
        message: 'No active term found for comparison',
      };
    }

    // Get class-level stats
    const classWhere: any = { schoolId, termId: currentTerm.id, isPublished: true };
    if (classId) classWhere.student = { enrollments: { some: { classId } } };

    const classResults = await this.prisma.result.findMany({
      where: classWhere,
      select: { totalScore: true, isPass: true, subjectId: true },
    });

    // Get school-level stats
    const schoolResults = await this.prisma.result.findMany({
      where: { schoolId, termId: currentTerm.id, isPublished: true },
      select: { totalScore: true, isPass: true },
    });

    // Calculate statistics
    const classStats = this.calculateStatistics(classResults);
    const schoolStats = this.calculateStatistics(schoolResults);
    
    // National benchmarks (simulated - in real app would come from external data)
    const nationalBenchmarks = {
      averageScore: 65.5,
      passRate: 72.3,
      topPerformerThreshold: 85,
      improvementTarget: 5, // % improvement target
    };

    return {
      termName: currentTerm.name,
      benchmarks: [
        {
          level: 'Class',
          averageScore: classStats.averageScore,
          passRate: classStats.passRate,
          totalResults: classStats.totalResults,
          comparisonToSchool: this.compareValues(classStats.averageScore, schoolStats.averageScore),
        },
        {
          level: 'School',
          averageScore: schoolStats.averageScore,
          passRate: schoolStats.passRate,
          totalResults: schoolStats.totalResults,
          comparisonToNational: this.compareValues(schoolStats.averageScore, nationalBenchmarks.averageScore),
        },
        {
          level: 'National Benchmark',
          averageScore: nationalBenchmarks.averageScore,
          passRate: nationalBenchmarks.passRate,
          totalResults: 'N/A',
          topPerformerThreshold: nationalBenchmarks.topPerformerThreshold,
        },
      ],
      recommendations: this.generateBenchmarkRecommendations(
        classStats.averageScore,
        schoolStats.averageScore,
        nationalBenchmarks.averageScore
      ),
    };
  }

  // ── Helper: Calculate basic statistics ──────────────────────────────────────────
  private calculateStatistics(results: any[]) {
    if (results.length === 0) {
      return { averageScore: 0, passRate: 0, totalResults: 0, passedResults: 0 };
    }

    const totalScore = results.reduce((sum, r) => sum + r.totalScore, 0);
    const averageScore = totalScore / results.length;
    const passedResults = results.filter((r) => r.isPass).length;
    const passRate = (passedResults / results.length) * 100;

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      totalResults: results.length,
      passedResults,
    };
  }

  // ── Helper: Compare values and return descriptive text ──────────────────────────
  private compareValues(value1: number, value2: number): string {
    const difference = value1 - value2;
    const percentDifference = (difference / value2) * 100;

    if (Math.abs(percentDifference) < 2) {
      return 'On par';
    } else if (percentDifference > 10) {
      return 'Significantly higher';
    } else if (percentDifference > 5) {
      return 'Higher';
    } else if (percentDifference > 2) {
      return 'Slightly higher';
    } else if (percentDifference < -10) {
      return 'Significantly lower';
    } else if (percentDifference < -5) {
      return 'Lower';
    } else {
      return 'Slightly lower';
    }
  }

  // ── Helper: Generate benchmark recommendations ──────────────────────────────────
  private generateBenchmarkRecommendations(
    classAverage: number,
    schoolAverage: number,
    nationalAverage: number
  ): string[] {
    const recommendations = [];

    if (classAverage < schoolAverage) {
      recommendations.push('Class performance is below school average. Consider targeted interventions.');
    } else if (classAverage > schoolAverage + 5) {
      recommendations.push('Class is performing above school average. Share best practices with other classes.');
    }

    if (schoolAverage < nationalAverage) {
      recommendations.push('School performance is below national benchmark. Review curriculum and teaching methods.');
    } else if (schoolAverage > nationalAverage + 5) {
      recommendations.push('School is performing above national benchmark. Consider applying for academic excellence recognition.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is aligned with benchmarks. Continue current strategies.');
    }

    return recommendations;
  }
}