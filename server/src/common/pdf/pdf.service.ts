import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateReportCard(
    studentId: string,
    termId: string,
    schoolId: string,
  ): Promise<Buffer> {
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
    const schoolName = student.school.name;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(schoolName.toUpperCase(), { align: 'center' });
      doc.fontSize(12).text('STUDENT REPORT CARD', { align: 'center' });
      doc.moveDown();

      doc.fontSize(10);
      doc.text(`Student: ${student.firstName} ${student.lastName}`);
      doc.text(`Admission No: ${student.admissionNumber}`);
      doc.text(`Class: ${className}`);
      doc.text(`Term: ${termName}`);
      doc.moveDown();

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Subject', 50, doc.y, { width: 200 });
      doc.text('Total Score', 250, doc.y - 12, { width: 80, align: 'center' });
      doc.text('Grade', 330, doc.y - 12, { width: 60, align: 'center' });
      doc.text('Remark', 390, doc.y - 12, { width: 100, align: 'center' });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(9);
      let totalScore = 0;
      let subjectCount = 0;

      for (const result of student.results) {
        const grade = this.getGrade(result.totalScore);
        totalScore += result.totalScore;
        subjectCount++;

        doc.text(result.subject.name, 50, doc.y, { width: 200 });
        doc.text(result.totalScore.toFixed(1), 250, doc.y - 11, { width: 80, align: 'center' });
        doc.text(grade, 330, doc.y - 11, { width: 60, align: 'center' });
        doc.text(this.getRemark(grade), 390, doc.y - 11, { width: 100, align: 'center' });
        doc.moveDown();
      }

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(10);
      const average = subjectCount > 0 ? totalScore / subjectCount : 0;
      doc.text(`Total Subjects: ${subjectCount}`);
      doc.text(`Average Score: ${average.toFixed(1)}`);
      doc.text(`Overall Grade: ${this.getGrade(average)}`);

      doc.moveDown(2);
      doc.font('Helvetica').fontSize(8).fillColor('gray');
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.text('This is a computer-generated document.', { align: 'center' });

      doc.end();
    });
  }

  async generateBroadsheet(
    classId: string,
    termId: string,
    schoolId: string,
  ): Promise<Buffer> {
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

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text(classData.school.name.toUpperCase(), { align: 'center' });
      doc.fontSize(12).text('ACADEMIC BROADSHEET', { align: 'center' });
      doc.fontSize(10).text(`Class: ${classData.name} | Term: ${term?.name || 'N/A'}`, { align: 'center' });
      doc.moveDown();

      const subjectColWidth = 50;
      let x = 30;
      const startY = doc.y;

      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('#', x, startY, { width: 30, align: 'center' });
      x += 30;
      doc.text('Student Name', x, startY, { width: 100 });
      x += 100;

      for (const [, subjectName] of subjects) {
        doc.text(subjectName.substring(0, 6), x, startY, { width: subjectColWidth, align: 'center' });
        x += subjectColWidth;
      }
      doc.text('Avg', x, startY, { width: 40, align: 'center' });

      doc.moveTo(30, doc.y + 5).lineTo(820, doc.y).stroke();
      doc.moveDown();

      doc.font('Helvetica').fontSize(7);
      let rowNum = 1;

      for (const enrollment of classData.enrollments) {
        x = 30;
        const student = enrollment.student;

        doc.text(String(rowNum), x, doc.y, { width: 30, align: 'center' });
        x += 30;
        doc.text(`${student.lastName} ${student.firstName}`, x, doc.y - 10, { width: 100 });
        x += 100;

        let total = 0;
        let count = 0;

        for (const [subjectId] of subjects) {
          const result = student.results.find((r) => r.subjectId === subjectId);
          const score = result ? result.totalScore.toFixed(0) : '-';
          if (result) {
            total += result.totalScore;
            count++;
          }
          doc.text(score, x, doc.y - 10, { width: subjectColWidth, align: 'center' });
          x += subjectColWidth;
        }

        const avg = count > 0 ? (total / count).toFixed(1) : '-';
        doc.text(avg, x, doc.y - 10, { width: 40, align: 'center' });
        doc.moveDown();
        rowNum++;
      }

      doc.moveDown();
      doc.fontSize(7).fillColor('gray');
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

      doc.end();
    });
  }

  private getGrade(score: number): string {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  }

  async generateTranscript(
    studentId: string,
    schoolId: string,
  ): Promise<Buffer> {
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

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(student.school.name.toUpperCase(), { align: 'center' });
      doc.fontSize(16).text('OFFICIAL ACADEMIC TRANSCRIPT', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Student: ${student.firstName} ${student.lastName}`);
      doc.text(`Admission No: ${student.admissionNumber}`);
      doc.text(`Date of Birth: ${student.dateOfBirth?.toLocaleDateString() || 'N/A'}`);
      doc.moveDown();

      let cumulativeTotalPoints = 0;
      let cumulativeTotalUnits = 0;

      for (const [, termData] of termsMap) {
        const { term, session, results } = termData;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text(`${session.name} - ${term.name}`, 50, doc.y);
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Subject', 50, doc.y, { width: 200 });
        doc.text('Score', 250, doc.y - 10, { width: 80, align: 'center' });
        doc.text('Grade', 330, doc.y - 10, { width: 60, align: 'center' });
        doc.text('Units', 390, doc.y - 10, { width: 60, align: 'center' });
        doc.text('Points', 450, doc.y - 10, { width: 60, align: 'center' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(9);
        let termTotalPoints = 0;
        let termTotalUnits = 0;

        for (const result of results) {
          const grade = this.getGrade(result.totalScore);
          const units = 1;
          const points = this.gradeToPoints(grade) * units;

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
        doc.moveDown(0.5);
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
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(12);
      const cumulativeGPA = cumulativeTotalUnits > 0 ? cumulativeTotalPoints / cumulativeTotalUnits : 0;
      doc.text(`Cumulative Total Units: ${cumulativeTotalUnits}`);
      doc.text(`Cumulative GPA: ${cumulativeGPA.toFixed(2)}`);

      doc.moveDown(2);
      doc.font('Helvetica').fontSize(8).fillColor('gray');
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.text('This is a computer-generated document.', { align: 'center' });
      doc.text('Transcript is valid only with the institution seal and signature.', { align: 'center' });

      doc.end();
    });
  }

  private getRemark(grade: string): string {
    const remarks: Record<string, string> = {
      A: 'Excellent',
      B: 'Very Good',
      C: 'Good',
      D: 'Fair',
      E: 'Pass',
      F: 'Fail',
    };
    return remarks[grade] || '';
  }

  private gradeToPoints(grade: string): number {
    const points: Record<string, number> = {
      A: 5.0,
      B: 4.0,
      C: 3.0,
      D: 2.0,
      E: 1.0,
      F: 0.0,
    };
    return points[grade] || 0.0;
  }
}
