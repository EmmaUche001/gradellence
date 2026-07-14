import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../database/prisma.service';
import { resolveGrade, assignPositions, GradeScaleEntry } from '../../modules/results/grading.util';
import { VerifyService } from '../verify/verify.service';

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
      select: { grade: true, minScore: true, maxScore: true, remark: true },
    });
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

  private async addSchoolBranding(doc: any, school: { name: string; logo?: string | null; signatureUrl?: string | null }, y?: number) {
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

  async generateReportCard(studentId: string, termId: string, schoolId: string): Promise<Buffer> {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        school: true,
        results: {
          where: { termId },
          include: { subject: true, term: true },
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

    const className = student.enrollments[0]?.class?.name || 'N/A';
    const termName = student.results[0]?.term?.name || 'N/A';
    const gradeScales = await this.getActiveGradeScales(schoolId);

    const studentName = `${student.firstName} ${student.lastName}`;
    const { qrDataUrl } = await this.verifyService.createVerification({
      documentType: 'report-card',
      entityId: studentId,
      schoolId,
      studentId,
      studentName,
      termId,
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.addWatermark(doc);

      this.addSchoolBranding(doc, student.school, 50).then(() => {
        doc.fontSize(12).font('Helvetica-Bold').text('STUDENT REPORT CARD', { align: 'center' });
        doc.moveDown();

        doc.fontSize(10).font('Helvetica');
        doc.text(`Student: ${studentName}`);
        doc.text(`Admission No: ${student.admissionNumber}`);
        doc.text(`Class: ${className}`);
        doc.text(`Term: ${termName}`);
        doc.moveDown();

        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Subject', 50, tableTop, { width: 200 });
        doc.text('Total Score', 250, tableTop, { width: 80, align: 'center' });
        doc.text('Grade', 330, tableTop, { width: 60, align: 'center' });
        doc.text('Remark', 390, tableTop, { width: 100, align: 'center' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(9);
        let totalScore = 0;
        let subjectCount = 0;

        for (const result of student.results) {
          const { grade, remark } =
            result.grade !== null
              ? { grade: result.grade, remark: result.remark }
              : resolveGrade(result.totalScore, gradeScales);
          totalScore += result.totalScore;
          subjectCount++;

          doc.text(result.subject.name, 50, doc.y, { width: 200 });
          doc.text(result.totalScore.toFixed(1), 250, doc.y - 11, { width: 80, align: 'center' });
          doc.text(grade ?? '-', 330, doc.y - 11, { width: 60, align: 'center' });
          doc.text(remark ?? '-', 390, doc.y - 11, { width: 100, align: 'center' });
          doc.moveDown();
        }

        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(10);
        const average = subjectCount > 0 ? totalScore / subjectCount : 0;
        const overallGrade = resolveGrade(average, gradeScales).grade;
        doc.text(`Total Subjects: ${subjectCount}`);
        doc.text(`Average Score: ${average.toFixed(1)}`);
        doc.text(`Overall Grade: ${overallGrade ?? '-'}`);

        doc.moveDown(2);
        doc.font('Helvetica').fontSize(8).fillColor('gray');
        doc.text('________________________________', { align: 'center' });
        doc.fontSize(8).fillColor('gray');
        doc.text('School Stamp / Signature', { align: 'center' });

    const schoolSignature = (student.school as any).signatureUrl;
    if (schoolSignature) {
      this.addSignatureImage(doc, schoolSignature, doc.y + 10);
    }

    this.addFooterWithQR(doc, qrDataUrl, 0).then(() => {
          doc.end();
        });
      });
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

        doc.moveTo(30, doc.y + 5).lineTo(820, doc.y).stroke();
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
          include: {
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
      const termKey = `${result.term.sessionId}-${result.termId}`;
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
        doc.fontSize(16).font('Helvetica-Bold').text('OFFICIAL ACADEMIC TRANSCRIPT', { align: 'center' });
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
}