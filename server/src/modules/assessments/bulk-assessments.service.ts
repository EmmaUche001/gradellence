import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseImportService } from '../../common/import/base-import.service';
import { ImportResult, ImportError } from '../../common/import/import-result.interface';

interface AssessmentImportRow {
  admissionNumber: string;
  subjectCode: string;
  termId: string;
  ca1?: string;
  ca2?: string;
  ca3?: string;
  exam?: string;
  [key: string]: string | undefined;
}

const EXPECTED_HEADERS = ['admissionNumber', 'subjectCode', 'termId', 'ca1', 'ca2', 'ca3', 'exam'];

@Injectable()
export class BulkAssessmentsService extends BaseImportService {
  protected readonly logger = new Logger(BulkAssessmentsService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async importAssessments(schoolId: string, csvContent: string): Promise<ImportResult> {
    const { data, errors } = this.parseCsv<AssessmentImportRow>(csvContent, EXPECTED_HEADERS);

    if (errors.length > 0) {
      return this.failure<AssessmentImportRow>(errors);
    }

    const rowErrors: ImportError[] = [];
    const successCounts: number[] = [];

    // Pre-fetch students
    const admissionNumbers = Array.from(
      new Set(data.map((r) => r.admissionNumber.trim()).filter((x) => !!x)),
    );
    const students =
      admissionNumbers.length > 0
        ? await this.prisma.student.findMany({
            where: { schoolId, admissionNumber: { in: admissionNumbers } },
            select: { id: true, admissionNumber: true },
          })
        : [];
    const studentMap = new Map(students.map((s) => [s.admissionNumber, s.id]));

    // Pre-fetch subjects
    const subjectCodes = Array.from(
      new Set(data.map((r) => r.subjectCode.trim()).filter((x) => !!x)),
    );
    const subjects =
      subjectCodes.length > 0
        ? await this.prisma.subject.findMany({
            where: { schoolId, code: { in: subjectCodes } },
            select: { id: true, code: true },
          })
        : [];
    const subjectMap = new Map(subjects.map((s) => [s.code, s.id]));

    // Collect term IDs for validation
    const termIds = Array.from(new Set(data.map((r) => r.termId.trim()).filter((x) => !!x)));
    const terms =
      termIds.length > 0
        ? await this.prisma.term.findMany({
            where: { id: { in: termIds }, schoolId },
            select: { id: true },
          })
        : [];
    const termSet = new Set(terms.map((t) => t.id));

    const batchSize = 50;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const operations: any[] = [];
      const batchRowErrors: ImportError[] = [];

      for (let idx = 0; idx < batch.length; idx++) {
        const row = batch[idx];
        const globalRowNumber = i + idx + 2;
        const rowErrors: ImportError[] = [];

        if (!row.admissionNumber?.trim()) {
          rowErrors.push({ row: globalRowNumber, column: 'admissionNumber', message: 'Required' });
        }
        if (!row.subjectCode?.trim()) {
          rowErrors.push({ row: globalRowNumber, column: 'subjectCode', message: 'Required' });
        }
        if (!row.termId?.trim()) {
          rowErrors.push({ row: globalRowNumber, column: 'termId', message: 'Required' });
        }

        if (rowErrors.length > 0) {
          batchRowErrors.push(...rowErrors);
          continue;
        }

        const student = studentMap.get(row.admissionNumber.trim());
        const subject = subjectMap.get(row.subjectCode.trim());
        const termId = row.termId.trim();

        if (!student) {
          batchRowErrors.push({
            row: globalRowNumber,
            column: 'admissionNumber',
            message: 'Student not found',
            value: row.admissionNumber,
          });
          continue;
        }
        if (!subject) {
          batchRowErrors.push({
            row: globalRowNumber,
            column: 'subjectCode',
            message: 'Subject not found',
            value: row.subjectCode,
          });
          continue;
        }
        if (!termSet.has(termId)) {
          batchRowErrors.push({
            row: globalRowNumber,
            column: 'termId',
            message: 'Invalid term',
            value: termId,
          });
          continue;
        }

        const scores = ['ca1', 'ca2', 'ca3', 'exam'];
        for (const type of scores) {
          const score = parseFloat(row[type] || '');
          if (!isNaN(score) && score >= 0) {
            const uniqueWhere: any = {
              studentId_subjectId_termId_type: {
                studentId: student,
                subjectId: subject,
                termId,
                type: type.toUpperCase(),
              },
            };
            operations.push(
              this.prisma.assessment.upsert({
                where: uniqueWhere,
                create: {
                  schoolId,
                  studentId: student,
                  subjectId: subject,
                  termId,
                  teacherId: '',
                  type: type.toUpperCase(),
                  score,
                  maxScore: 100,
                  weight: type === 'exam' ? 0.5 : 0.125,
                },
                update: { score, maxScore: 100, weight: type === 'exam' ? 0.5 : 0.125 },
              }),
            );
          }
        }
      }

      if (operations.length > 0) {
        await this.prisma.$transaction(operations);
        const successCount = operations.length;
        successCounts.push(...Array(successCount).fill(1));
      }

      rowErrors.push(...batchRowErrors);
    }

    const successCount = successCounts.length;
    const allErrors = [...errors, ...rowErrors];

    if (allErrors.length > 0) {
      return this.failure(allErrors, successCount);
    }

    return this.success(successCount);
  }
}
