import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../database/prisma.service';
import {
  resolveGrade,
  assignPositions,
  GradeScaleEntry,
  calculateGPA,
  calculateCumulativeGPA,
} from '../../modules/results/grading.util';
import { VerifyService } from '../verify/verify.service';
import { getTemplate } from './templates';
import {
  ReportCardData,
  ReportCardBranding,
  ReportCardResultRow,
  asStringArray,
} from './templates/report-card.types';

const DEFAULT_BRANDING: ReportCardBranding = {
  template: 'classic',
  accentColor: '#1a56db',
  motto: null,
  principalName: null,
  principalSignature: null,
  schoolStamp: null,
  showRanking: true,
  showCumulative: true,
  showAffective: false,
  showPsychomotor: false,
  showTeacherRemark: true,
  showPrincipalRemark: true,
  showResumptionDate: true,
  showStamp: true,
  showPoweredBy: true,
  affectiveTraits: ['Punctuality', 'Neatness', 'Honesty', 'Cooperation', 'Attentiveness', 'Perseverance'],
  psychomotorTraits: ['Drawing', 'Sports', 'Handwriting', 'Musical Skills'],
  footerText: null,
  nextTermDate: null,
};

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verifyService: VerifyService,
  ) {}

  private async getActiveGradeScales(schoolId: string): Promise<GradeScaleEntry[]> {
    return this.prisma.gradeScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { minScore: 'desc' },
      select: {
        grade: true,
        minScore: true,
        maxScore: true,
        remark: true,
        points: true,
        isPass: true,
      },
    }) as unknown as GradeScaleEntry[];
  }

  private addWatermark(doc: any) {
    const fontSize = 48;
    doc.save();
    doc.fontSize(fontSize);
    doc.font('Helvetica');
    doc.fillColor('#dddddd');

    const centerX = doc.page.width / 2;
    const centerY = doc.page.height / 2;

    doc.save();
    doc.translate(centerX, centerY);
    doc.rotate(-30);
    doc.text('GRADELLENCE', 0, 0, {
      align: 'center',
      width: 400,
      opacity: 0.15,
    });
    doc.restore();
    doc.restore();
  }

  private addWatermarkForBulk(doc: any) {
    this.addWatermark(doc);
  }

  private async addFooterWithQR(doc: any, qrDataUrl: string | null, y: number) {
    const footerY = y || doc.page.height - 80;

    try {
      if (qrDataUrl) {
        let imageArg: any = qrDataUrl;
        if (typeof qrDataUrl === 'string' && qrDataUrl.startsWith('data:')) {
          const base64 = qrDataUrl.split(',')[1] || '';
          imageArg = Buffer.from(base64, 'base64');
        }
        doc.image(imageArg, doc.page.width - 80 - 50, footerY - 40, {
          width: 80,
          height: 80,
        });

        doc.fontSize(7).fillColor('#888888');
        doc.text('Scan to verify document', doc.page.width - 80 - 50, footerY + 45, {
          width: 80,
          align: 'center',
        });
      }
    } catch {
      // Ignore image rendering errors in headless/test environments
    }

    doc.fontSize(7).fillColor('#888888');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 50, footerY);
    doc.text('This is a computer-generated document.', 50, footerY + 12);
    if (qrDataUrl) {
      doc.text('Verify at: View QR code above', 50, footerY + 24);
    }
  }

  private async addSchoolBranding(
    doc: any,
    school: { name: string; logo?: string | null; signatureUrl?: string | null },
    y?: number,
  ) {
    const startY = y || 50;

    if (school.logo) {
      try {
        let imageArg: any = school.logo;
        if (typeof school.logo === 'string' && school.logo.startsWith('data:')) {
          const base64 = school.logo.split(',')[1] || '';
          imageArg = Buffer.from(base64, 'base64');
        } else if (typeof fetch === 'function' && !school.logo.startsWith('data:')) {
          const response = await fetch(school.logo);
          if (response.ok) {
            imageArg = Buffer.from(await response.arrayBuffer());
          } else {
            imageArg = null;
          }
        } else {
          imageArg = null;
        }

        if (imageArg) {
          doc.image(imageArg, doc.page.width / 2 - 25, startY - 10, {
            width: 50,
            height: 50,
          });
          doc.moveDown(6);
        }
      } catch {
        // Silently fail — text-only branding is the fallback
      }
    }

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#333333');
    doc.text(school.name.toUpperCase(), { align: 'center' });
    doc.moveDown(0.3);
  }

  private async addSignatureImage(doc: any, signatureUrl: string | null, y: number) {
    if (!signatureUrl) return;

    try {
      let imageArg: any = signatureUrl;
      if (typeof signatureUrl === 'string' && signatureUrl.startsWith('data:')) {
        const base64 = signatureUrl.split(',')[1] || '';
        imageArg = Buffer.from(base64, 'base64');
      } else if (typeof fetch === 'function' && !signatureUrl.startsWith('data:')) {
        const response = await fetch(signatureUrl);
        if (response.ok) {
          imageArg = Buffer.from(await response.arrayBuffer());
        } else {
          imageArg = null;
        }
      } else {
        imageArg = null;
      }

      if (imageArg) {
        doc.image(imageArg, doc.page.width / 2 - 40, y, {
          width: 80,
          height: 30,
        });
      }
    } catch {
      // Silently fail — text fallback
    }
  }

  private async getBranding(schoolId: string): Promise<ReportCardBranding> {
    try {
      const cfg = await (this.prisma as any).reportCardConfig?.findUnique?.({
        where: { schoolId },
      });
      if (!cfg) return { ...DEFAULT_BRANDING };
      return {
        ...DEFAULT_BRANDING,
        template: cfg.template ?? DEFAULT_BRANDING.template,
        accentColor: cfg.accentColor ?? DEFAULT_BRANDING.accentColor,
        motto: cfg.motto ?? null,
        principalName: cfg.principalName ?? null,
        principalSignature: cfg.principalSignature ?? null,
        schoolStamp: cfg.schoolStamp ?? null,
        showRanking: cfg.showRanking ?? true,
        showCumulative: cfg.showCumulative ?? true,
        showAffective: cfg.showAffective ?? false,
        showPsychomotor: cfg.showPsychomotor ?? false,
        showTeacherRemark: cfg.showTeacherRemark ?? true,
        showPrincipalRemark: cfg.showPrincipalRemark ?? true,
        showResumptionDate: cfg.showResumptionDate ?? true,
        showStamp: cfg.showStamp ?? true,
        showPoweredBy: cfg.showPoweredBy ?? true,
        affectiveTraits: asStringArray(cfg.affectiveTraits, DEFAULT_BRANDING.affectiveTraits),
        psychomotorTraits: asStringArray(cfg.psychomotorTraits, DEFAULT_BRANDING.psychomotorTraits),
        footerText: cfg.footerText ?? null,
        nextTermDate: cfg.nextTermDate
          ? new Date(cfg.nextTermDate).toLocaleDateString()
          : null,
      };
    } catch {
      return { ...DEFAULT_BRANDING };
    }
  }

  async generateReportCard(studentId: string, termId: string, schoolId: string): Promise<Buffer> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        school: true,
        results: {
          where: { termId, isPublished: true },
          select: {
            id: true,
            totalScore: true,
            grade: true,
            remark: true,
            points: true,
            isPass: true,
            subject: true,
            term: { include: { session: true } },
          },
        },
        enrollments: {
          where: { termId },
          include: { class: true },
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Per BATCH2 spec: require published results before generating a report card
    if (student.results.length === 0) {
      throw new BadRequestException('Results have not been published for this student and term');
    }

    const className = student.enrollments[0]?.class?.name || 'N/A';
    const classId = student.enrollments[0]?.class?.id;
    const termName = student.results[0]?.term?.name || 'N/A';
    const sessionName = (student.results[0]?.term as any)?.session?.name || '';
    const gradeScales = await this.getActiveGradeScales(schoolId);
    const branding = await this.getBranding(schoolId);

    // Build result rows
    const rows: ReportCardResultRow[] = [];
    let totalScore = 0;
    const resultsForGPA: { points: number | null }[] = [];
    for (const result of student.results) {
      const resolved =
        result.grade !== null
          ? { grade: result.grade, remark: result.remark, points: result.points }
          : resolveGrade(result.totalScore, gradeScales);
      totalScore += result.totalScore;
      resultsForGPA.push({ points: resolved.points });
      rows.push({
        subjectName: result.subject.name,
        totalScore: result.totalScore,
        grade: resolved.grade,
        remark: resolved.remark,
        points: resolved.points,
      });
    }
    const subjectCount = rows.length;
    const average = subjectCount > 0 ? totalScore / subjectCount : 0;
    const gpa = calculateGPA(resultsForGPA);
    const overallGrade = resolveGrade(average, gradeScales).grade;

    // Class ranking
    let position: number | null = null;
    let classSize: number | null = null;
    if (classId) {
      const classmates = await this.prisma.enrollment.findMany({
        where: { classId, termId },
        include: { student: { include: { results: { where: { termId } } } } },
      });
      const totals = classmates.map((e) => {
        const t = e.student.results.reduce((s, r) => s + r.totalScore, 0);
        const c = e.student.results.length;
        return { studentId: e.studentId, totalScore: c > 0 ? t / c : 0 };
      });
      classSize = totals.length;
      const ranked = assignPositions(totals);
      const me = ranked.find((r) => (r as any).studentId === studentId);
      position = me ? (me as any).position ?? null : null;
    }

    // Cumulative GPA across all terms
    const allResults = await this.prisma.result.findMany({
      where: { studentId, schoolId },
      select: { points: true, termId: true },
    });
    const byTerm = new Map<string, { points: number | null }[]>();
    for (const r of allResults) {
      if (!byTerm.has(r.termId)) byTerm.set(r.termId, []);
      byTerm.get(r.termId)!.push({ points: r.points });
    }
    const termsArray = Array.from(byTerm.values()).map((results) => ({ results }));
    const cumulativeGpa = termsArray.length ? calculateCumulativeGPA(termsArray) : null;

    const studentName = `${student.firstName} ${student.lastName}`;
    const { qrDataUrl } = await this.verifyService.createVerification({
      documentType: 'report-card',
      entityId: studentId,
      schoolId,
      studentId,
      studentName,
      termId,
    });

    const data: ReportCardData = {
      school: {
        name: student.school.name,
        logo: (student.school as any).logo ?? null,
        address: (student.school as any).address ?? null,
        phone: (student.school as any).phone ?? null,
        email: (student.school as any).email ?? null,
        signatureUrl: (student.school as any).signatureUrl ?? null,
      },
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
      },
      className,
      termName,
      sessionName,
      results: rows,
      summary: {
        subjectCount,
        totalScore,
        average,
        gpa,
        overallGrade,
        position,
        classSize,
        cumulativeGpa,
      },
      branding,
      gradeScales,
      qrDataUrl,
    };

    const template = getTemplate(branding.template);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.addWatermark(doc);

      template
        .render(doc, data)
        .then(() => doc.end())
        .catch(reject);
    });
  }

  async generateClassReportCardsZip(
    classId: string,
    termId: string,
    schoolId: string,
  ): Promise<Buffer> {
    const classData = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        enrollments: {
          where: { termId },
          include: { student: true },
        },
      },
    });

    if (!classData) {
      throw new Error('Class not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve());
      archive.on('error', reject);
    });

    for (const enrollment of classData.enrollments) {
      const pdf = await this.generateReportCard(enrollment.studentId, termId, schoolId);
      archive.append(pdf, {
        name: `${enrollment.student.firstName}-${enrollment.student.lastName}-report-card.pdf`,
      });
    }

    await archive.finalize();
    await done;

    return Buffer.concat(chunks);
  }

  async generatePreviewReportCard(schoolId: string): Promise<Buffer> {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
    });

    if (!school) {
      throw new Error('School not found');
    }

    const gradeScales = await this.getActiveGradeScales(schoolId);
    const branding = await this.getBranding(schoolId);

    const sampleSubjects = ['Mathematics', 'English Language', 'Basic Science', 'Social Studies'];
    const sampleScores = [82, 74, 68, 91];

    const rows: ReportCardResultRow[] = sampleSubjects.map((subjectName, i) => {
      const score = sampleScores[i];
      const resolved = resolveGrade(score, gradeScales);
      return {
        subjectName,
        totalScore: score,
        grade: resolved.grade,
        remark: resolved.remark,
        points: resolved.points,
      };
    });

    const totalScore = rows.reduce((s, r) => s + r.totalScore, 0);
    const subjectCount = rows.length;
    const average = subjectCount > 0 ? totalScore / subjectCount : 0;
    const gpa = calculateGPA(rows.map((r) => ({ points: r.points })));
    const overallGrade = resolveGrade(average, gradeScales).grade;

    const data: ReportCardData = {
      school: {
        name: school.name,
        logo: school.logo ?? null,
        address: school.address ?? null,
        phone: school.phone ?? null,
        email: school.email ?? null,
        signatureUrl: school.signatureUrl ?? null,
      },
      student: {
        firstName: 'Sample',
        lastName: 'Student',
        admissionNumber: 'SAMPLE-001',
      },
      className: 'Sample Class',
      termName: 'First Term',
      sessionName: '2025/2026',
      results: rows,
      summary: {
        subjectCount,
        totalScore,
        average,
        gpa,
        overallGrade,
        position: 3,
        classSize: 25,
        cumulativeGpa: 3.4,
      },
      branding,
      gradeScales,
      qrDataUrl: null,
    };

    const template = getTemplate(branding.template);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.addWatermark(doc);

      template
        .render(doc, data)
        .then(() => doc.end())
        .catch(reject);
    });
  }

  async generateBroadsheet(classId: string, termId: string, schoolId: string): Promise<Buffer> {
    const classData = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      include: {
        school: true,
        enrollments: {
          where: { termId },
          include: {
            student: {
              include: {
                results: {
                  where: { termId },
                  include: { subject: true },
                },
              },
            },
          },
        },
      },
    });

    if (!classData) {
      throw new Error('Class not found');
    }

    const subjects = new Map<string, string>();
    for (const enrollment of classData.enrollments) {
      for (const result of enrollment.student.results) {
        subjects.set(result.subject.id, result.subject.name);
      }
    }

    const term = await this.prisma.term.findFirst({
      where: { id: termId, schoolId },
    });

    const gradeScales = await this.getActiveGradeScales(schoolId);

    const rowsWithTotals = classData.enrollments.map((enrollment) => {
      const student = enrollment.student;
      let totalScore = 0;
      let count = 0;
      for (const [subjectId] of subjects) {
        const result = student.results.find((r) => r.subjectId === subjectId);
        if (result) {
          totalScore += result.totalScore;
          count++;
        }
      }
      const average = count > 0 ? totalScore / count : 0;
      const overallGrade = count > 0 ? resolveGrade(average, gradeScales).grade : null;
      return { enrollment, student, totalScore, subjectCount: count, average, overallGrade };
    });

    const rankedRows = assignPositions(rowsWithTotals);

    const { qrDataUrl } = await this.verifyService.createVerification({
      documentType: 'broadsheet',
      entityId: classId,
      schoolId,
      termId,
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.addWatermarkForBulk(doc);

      this.addSchoolBranding(doc, classData.school, 30).then(() => {
        doc.fontSize(12).font('Helvetica-Bold').text('ACADEMIC BROADSHEET', { align: 'center' });
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Class: ${classData.name} | Term: ${term?.name || 'N/A'}`, { align: 'center' });
        doc.moveDown();

        const subjectColWidth = 42;
        let x = 30;
        const startY = doc.y;

        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('Pos', x, startY, { width: 28, align: 'center' });
        x += 28;
        doc.text('Student Name', x, startY, { width: 100 });
        x += 100;

        for (const [, subjectName] of subjects) {
          doc.text(subjectName.substring(0, 6), x, startY, {
            width: subjectColWidth,
            align: 'center',
          });
          x += subjectColWidth;
        }
        doc.text('Avg', x, startY, { width: 35, align: 'center' });
        x += 35;
        doc.text('Grade', x, startY, { width: 35, align: 'center' });

        doc
          .moveTo(30, doc.y + 5)
          .lineTo(820, doc.y)
          .stroke();
        doc.moveDown();

        doc.font('Helvetica').fontSize(7);

        for (const row of rankedRows) {
          x = 30;
          const { student } = row;

          doc.text(String(row.position), x, doc.y, { width: 28, align: 'center' });
          x += 28;
          doc.text(`${student.lastName} ${student.firstName}`, x, doc.y - 10, { width: 100 });
          x += 100;

          for (const [subjectId] of subjects) {
            const result = student.results.find((r) => r.subjectId === subjectId);
            const score = result ? result.totalScore.toFixed(0) : '-';
            doc.text(score, x, doc.y - 10, { width: subjectColWidth, align: 'center' });
            x += subjectColWidth;
          }

          const avg = row.subjectCount > 0 ? row.average : 0;
          doc.text(row.subjectCount > 0 ? avg.toFixed(1) : '-', x, doc.y - 10, {
            width: 35,
            align: 'center',
          });
          x += 35;

          doc.text(row.overallGrade ?? '-', x, doc.y - 10, {
            width: 35,
            align: 'center',
          });
          doc.moveDown();
        }

        this.addFooterWithQR(doc, qrDataUrl, doc.y + 20).then(() => {
          doc.end();
        });
      });
    });
  }

  async generateTranscript(studentId: string, schoolId: string): Promise<Buffer> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        school: true,
        results: {
          select: {
            id: true,
            totalScore: true,
            grade: true,
            remark: true,
            points: true,
            isPass: true,
            subject: true,
            term: { include: { session: true } },
          },
          orderBy: [
            { term: { session: { name: 'asc' } } },
            { term: { name: 'asc' } },
            { subject: { name: 'asc' } },
          ],
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const termsMap = new Map<string, { term: any; session: any; results: any[] }>();
    for (const result of student.results) {
      const termKey = `${result.term.sessionId}-${result.term.id}`;
      if (!termsMap.has(termKey)) {
        termsMap.set(termKey, {
          term: result.term,
          session: result.term.session,
          results: [],
        });
      }
      termsMap.get(termKey)!.results.push(result);
    }

    const gradeScaleRows = await this.prisma.gradeScale.findMany({
      where: { schoolId, isActive: true },
      select: { grade: true, points: true },
    });
    const pointsByGrade = new Map(gradeScaleRows.map((gs) => [gs.grade, gs.points]));

    const studentName = `${student.firstName} ${student.lastName}`;
    const { qrDataUrl } = await this.verifyService.createVerification({
      documentType: 'transcript',
      entityId: studentId,
      schoolId,
      studentId,
      studentName,
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.addWatermark(doc);

      this.addSchoolBranding(doc, student.school, 50).then(() => {
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('OFFICIAL ACADEMIC TRANSCRIPT', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica');
        doc.text(`Student: ${studentName}`);
        doc.text(`Admission No: ${student.admissionNumber}`);
        doc.text(`Date of Birth: ${student.dateOfBirth?.toLocaleDateString() || 'N/A'}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Academic Record', { underline: true });
        doc.moveDown();

        let cumulativeTotalPoints = 0;
        let cumulativeTotalUnits = 0;

        for (const [, termData] of termsMap) {
          const { term, session, results } = termData;
          doc.font('Helvetica-Bold').fontSize(11);
          doc.text(`${session.name} - ${term.name}`);
          doc.moveDown(0.3);

          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('Subject', 50, doc.y, { width: 200 });
          doc.text('Score', 250, doc.y - 10, { width: 80, align: 'center' });
          doc.text('Grade', 330, doc.y - 10, { width: 60, align: 'center' });
          doc.text('Units', 390, doc.y - 10, { width: 60, align: 'center' });
          doc.text('Points', 450, doc.y - 10, { width: 60, align: 'center' });
          doc.moveDown();
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.3);

          doc.font('Helvetica').fontSize(9);
          let termTotalPoints = 0;
          let termTotalUnits = 0;

          for (const result of results) {
            const grade = result.grade ?? 'N/A';
            const units = 1;
            const points = (pointsByGrade.get(grade) ?? 0) * units;

            doc.text(result.subject.name, 50, doc.y, { width: 200 });
            doc.text(result.totalScore.toFixed(1), 250, doc.y - 9, { width: 80, align: 'center' });
            doc.text(grade, 330, doc.y - 9, { width: 60, align: 'center' });
            doc.text(units.toString(), 390, doc.y - 9, { width: 60, align: 'center' });
            doc.text(points.toString(), 450, doc.y - 9, { width: 60, align: 'center' });
            doc.moveDown();

            termTotalPoints += points;
            termTotalUnits += units;
          }

          doc.moveDown();
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.3);
          doc.font('Helvetica-Bold').fontSize(9);
          const termGPA = termTotalUnits > 0 ? termTotalPoints / termTotalUnits : 0;
          doc.text(`Term Total Units: ${termTotalUnits}`);
          doc.text(`Term GPA: ${termGPA.toFixed(2)}`);
          doc.moveDown(1);

          cumulativeTotalPoints += termTotalPoints;
          cumulativeTotalUnits += termTotalUnits;
        }

        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(12);
        const cumulativeGPA =
          cumulativeTotalUnits > 0 ? cumulativeTotalPoints / cumulativeTotalUnits : 0;
        doc.text(`Cumulative Total Units: ${cumulativeTotalUnits}`);
        doc.text(`Cumulative GPA: ${cumulativeGPA.toFixed(2)}`);

        doc.moveDown(2);
        doc.font('Helvetica').fontSize(8).fillColor('gray');
        doc.text('________________________________', { align: 'center' });
        doc.text('School Stamp / Signature', { align: 'center' });

        const transcriptSignature = (student.school as any).signatureUrl;
        if (transcriptSignature) {
          this.addSignatureImage(doc, transcriptSignature, doc.y + 10);
        }

        doc.text('Transcript is valid only with the institution seal and signature.', {
          align: 'center',
        });

        this.addFooterWithQR(doc, qrDataUrl, 0).then(() => {
          doc.end();
        });
      });
    });
  }

  async generateAcademicSummary(studentId: string, schoolId: string): Promise<Buffer> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        school: true,
        results: {
          select: {
            id: true,
            totalScore: true,
            grade: true,
            remark: true,
            points: true,
            isPass: true,
            subject: true,
            term: { include: { session: true } },
          },
          orderBy: [{ term: { session: { name: 'asc' } } }, { term: { name: 'asc' } }],
        },
      },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const termsMap = new Map<string, { term: any; session: any; results: any[] }>();
    const termsArray: { results: { points: number | null }[] }[] = [];
    for (const result of student.results) {
      const termKey = `${result.term.sessionId}-${result.term.id}`;
      if (!termsMap.has(termKey)) {
        termsMap.set(termKey, {
          term: result.term,
          session: result.term.session,
          results: [],
        });
      }
      termsMap.get(termKey)!.results.push(result);
    }

    // Prepare termsArray for calculateCumulativeGPA
    for (const [, termData] of termsMap) {
      termsArray.push({ results: termData.results });
    }

    const gradeScales = await this.getActiveGradeScales(schoolId);
    const studentName = `${student.firstName} ${student.lastName}`;
    const { qrDataUrl } = await this.verifyService.createVerification({
      documentType: 'academic-summary',
      entityId: studentId,
      schoolId,
      studentId,
      studentName,
    });

    // Calculate overall stats
    let totalScore = 0;
    let totalSubjects = 0;
    let passedSubjects = 0;

    for (const [, termData] of termsMap) {
      for (const result of termData.results) {
        totalScore += result.totalScore;
        totalSubjects++;
        // Use result.isPass or resolve to get isPass
        const isPass =
          result.isPass !== undefined
            ? result.isPass
            : resolveGrade(result.totalScore, gradeScales).isPass;
        if (isPass) {
          passedSubjects++;
        }
      }
    }

    const overallAverage = totalSubjects > 0 ? totalScore / totalSubjects : 0;
    const overallGrade = resolveGrade(overallAverage, gradeScales).grade;
    const cumulativeGPA = calculateCumulativeGPA(termsArray);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.addWatermark(doc);

      this.addSchoolBranding(doc, student.school, 50).then(() => {
        doc.fontSize(16).font('Helvetica-Bold').text('ACADEMIC SUMMARY', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica');
        doc.text(`Student: ${studentName}`);
        doc.text(`Admission No: ${student.admissionNumber}`);
        doc.text(`Date of Birth: ${student.dateOfBirth?.toLocaleDateString() || 'N/A'}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').fontSize(14).text('Overall Performance', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Total Subjects: ${totalSubjects}`);
        doc.text(`Overall Average Score: ${overallAverage.toFixed(2)}`);
        doc.text(`Overall Grade: ${overallGrade || 'N/A'}`);
        doc.text(`Passed Subjects: ${passedSubjects} / ${totalSubjects}`);
        doc.text(
          `Pass Rate: ${totalSubjects > 0 ? ((passedSubjects / totalSubjects) * 100).toFixed(1) : 0}%`,
        );
        doc.text(`Cumulative GPA: ${cumulativeGPA.toFixed(2)}`);
        doc.moveDown(1);

        doc.font('Helvetica-Bold').fontSize(14).text('Term-wise Performance', { underline: true });
        doc.moveDown(0.5);

        for (const [, termData] of termsMap) {
          const { term, session, results } = termData;
          doc.font('Helvetica-Bold').fontSize(11).text(`${session.name} - ${term.name}`);
          doc.moveDown(0.3);

          // Calculate term stats
          let termTotalScore = 0;
          let termTotalSubjects = 0;
          let termPassed = 0;

          for (const result of results) {
            termTotalScore += result.totalScore;
            termTotalSubjects++;
            const isPass =
              result.isPass !== undefined
                ? result.isPass
                : resolveGrade(result.totalScore, gradeScales).isPass;
            if (isPass) {
              termPassed++;
            }
          }

          const termAverage = termTotalSubjects > 0 ? termTotalScore / termTotalSubjects : 0;
          const termGrade = resolveGrade(termAverage, gradeScales).grade;
          const termGPA = calculateGPA(results);

          doc.font('Helvetica').fontSize(10);
          doc.text(`  Subjects: ${termTotalSubjects}`);
          doc.text(`  Average Score: ${termAverage.toFixed(2)}`);
          doc.text(`  Grade: ${termGrade || 'N/A'}`);
          doc.text(`  Term GPA: ${termGPA.toFixed(2)}`);
          doc.text(
            `  Pass Rate: ${termTotalSubjects > 0 ? ((termPassed / termTotalSubjects) * 100).toFixed(1) : 0}%`,
          );
          doc.moveDown(0.8);
        }

        doc.moveDown(2);
        doc.font('Helvetica').fontSize(8).fillColor('gray');
        doc.text('________________________________', { align: 'center' });
        doc.text('School Stamp / Signature', { align: 'center' });

        const summarySignature = (student.school as any).signatureUrl;
        if (summarySignature) {
          this.addSignatureImage(doc, summarySignature, doc.y + 10);
        }

        doc.text('Academic Summary is valid only with the institution seal and signature.', {
          align: 'center',
        });

        this.addFooterWithQR(doc, qrDataUrl, 0).then(() => {
          doc.end();
        });
      });
    });
  }
}
