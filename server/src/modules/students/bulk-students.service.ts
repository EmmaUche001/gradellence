import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseImportService } from '../../common/import/base-import.service';
import { ImportResult, ImportError } from '../../common/import/import-result.interface';

interface StudentImportRow {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

const EXPECTED_HEADERS = [
  'admissionNumber',
  'firstName',
  'lastName',
  'dateOfBirth',
  'gender',
  'parentName',
  'parentEmail',
  'parentPhone',
];

@Injectable()
export class BulkStudentsService extends BaseImportService {
  protected readonly logger = new Logger(BulkStudentsService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async importStudents(schoolId: string, csvContent: string): Promise<ImportResult> {
    const { data, errors } = this.parseCsv<StudentImportRow>(csvContent, EXPECTED_HEADERS);

    if (errors.length > 0) {
      return this.failure<StudentImportRow>(errors);
    }

    const successCounts: number[] = [];
    const rowErrors: ImportError[] = [];

    // Collect existing admission numbers in one query
    const admissionNumbers = data.map((row) => row.admissionNumber.trim());
    const existing = await this.prisma.student.findMany({
      where: { schoolId, admissionNumber: { in: admissionNumbers } },
      select: { admissionNumber: true },
    });
    const existingSet = new Set(existing.map((s) => s.admissionNumber));

    // Pre-fetch parents for linking
    const parentEmails = Array.from(
      new Set(data.map((r) => r.parentEmail?.trim()).filter((x): x is string => !!x)),
    );
    const parents =
      parentEmails.length > 0
        ? await this.prisma.parent.findMany({
            where: { schoolId, email: { in: parentEmails } },
            select: { id: true, email: true },
          })
        : [];
    const parentMap = new Map(parents.map((p) => [p.email, p.id]));

    // Max 50 writes per transaction to avoid timeouts
    const batchSize = 50;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      // Collect valid operations first
      const operations: any[] = [];
      const batchRowErrors: ImportError[] = [];

      for (let idx = 0; idx < batch.length; idx++) {
        const row = batch[idx];
        const globalRowNumber = i + idx + 2;
        const rowErrors: ImportError[] = [];

        // Validate required fields
        if (!row.admissionNumber?.trim()) {
          rowErrors.push({ row: globalRowNumber, column: 'admissionNumber', message: 'Required' });
        }
        if (!row.firstName?.trim()) {
          rowErrors.push({ row: globalRowNumber, column: 'firstName', message: 'Required' });
        }
        if (!row.lastName?.trim()) {
          rowErrors.push({ row: globalRowNumber, column: 'lastName', message: 'Required' });
        }

        if (rowErrors.length > 0) {
          batchRowErrors.push(...rowErrors);
          continue;
        }

        const admissionNumber = row.admissionNumber.trim();
        if (existingSet.has(admissionNumber)) {
          batchRowErrors.push({
            row: globalRowNumber,
            column: 'admissionNumber',
            message: 'Duplicate admission number',
            value: admissionNumber,
          });
          continue;
        }

        const parentId = row.parentEmail ? parentMap.get(row.parentEmail.trim()) : undefined;

        operations.push(
          this.prisma.student.create({
            data: {
              schoolId,
              admissionNumber,
              firstName: row.firstName.trim(),
              lastName: row.lastName.trim(),
              dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
              gender: row.gender?.trim() || undefined,
              parentName: row.parentName?.trim() || undefined,
              parentEmail: row.parentEmail?.trim() || undefined,
              parentPhone: row.parentPhone?.trim() || undefined,
              isActive: true,
              userId: null,
            },
          }),
        );
      }

      // Execute valid operations in a single transaction
      if (operations.length > 0) {
        const created = await this.prisma.$transaction(operations);
        created.forEach(() => successCounts.push(1));
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
