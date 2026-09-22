import { Injectable, Logger } from '@nestjs/common';
import * as Papa from 'papaparse';
import { PrismaService } from '../../database/prisma.service';
import { BaseImportService } from '../../common/import/base-import.service';
import { ImportResult, ImportError } from '../../common/import/import-result.interface';

interface StudentImportRow {
  admissionNumber?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  email?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

// Extend the base result with enrollment count
type StudentImportResult = ImportResult & { enrolled: number };

// ── Flexible header aliases ─────────────────────────────────────────────────
// Maps any reasonable variant a user might use → our internal camelCase key
const HEADER_ALIASES: Record<string, keyof StudentImportRow> = {
  // admissionNumber
  admissionnumber: 'admissionNumber', admission_number: 'admissionNumber',
  'admission number': 'admissionNumber', admno: 'admissionNumber',
  'adm no': 'admissionNumber', adm_no: 'admissionNumber',
  admissionno: 'admissionNumber', 'admission no': 'admissionNumber',

  // firstName
  firstname: 'firstName', first_name: 'firstName',
  'first name': 'firstName', fname: 'firstName', forename: 'firstName',
  given_name: 'firstName', givenname: 'firstName', 'given name': 'firstName',

  // lastName
  lastname: 'lastName', last_name: 'lastName',
  'last name': 'lastName', lname: 'lastName', surname: 'lastName',
  familyname: 'lastName', family_name: 'lastName', 'family name': 'lastName',

  // dateOfBirth
  dateofbirth: 'dateOfBirth', date_of_birth: 'dateOfBirth',
  'date of birth': 'dateOfBirth', dob: 'dateOfBirth',
  birthdate: 'dateOfBirth', birth_date: 'dateOfBirth',

  // gender
  gender: 'gender', sex: 'gender',

  // address
  address: 'address', homeaddress: 'address', home_address: 'address',
  'home address': 'address',

  // phone
  phone: 'phone', phonenumber: 'phone', phone_number: 'phone',
  'phone number': 'phone', mobile: 'phone', telephone: 'phone',

  // email
  email: 'email', emailaddress: 'email', email_address: 'email',
  'email address': 'email', studentemail: 'email',

  // parentName
  parentname: 'parentName', parent_name: 'parentName',
  'parent name': 'parentName', guardianname: 'parentName',
  guardian_name: 'parentName', 'guardian name': 'parentName',
  guardian: 'parentName', parent: 'parentName',

  // parentEmail
  parentemail: 'parentEmail', parent_email: 'parentEmail',
  'parent email': 'parentEmail', guardianemail: 'parentEmail',
  guardian_email: 'parentEmail', 'guardian email': 'parentEmail',

  // parentPhone
  parentphone: 'parentPhone', parent_phone: 'parentPhone',
  'parent phone': 'parentPhone', guardianphone: 'parentPhone',
  guardian_phone: 'parentPhone', 'guardian phone': 'parentPhone',
  parentcontact: 'parentPhone', 'parent contact': 'parentPhone',
};

function normalizeKey(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return (HEADER_ALIASES[lower] as string) ?? raw.trim();
}

/** Remap a raw parsed row to our normalized camelCase keys */
function remapRow(raw: Record<string, string>): StudentImportRow {
  const out: any = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normalizeKey(k)] = v;
  }
  return out as StudentImportRow;
}

@Injectable()
export class BulkStudentsService extends BaseImportService {
  protected readonly logger = new Logger(BulkStudentsService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async importStudents(schoolId: string, csvContent: string, classId?: string, termId?: string): Promise<StudentImportResult> {
    // ── Step 1: Parse with auto delimiter detection ──────────────────────────
    const rawResult = Papa.parse<Record<string, string>>(csvContent.trim(), {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      // Let PapaParse detect delimiter — comma, semicolon, tab, pipe
    });

    // Collect parse errors, but ignore the benign "delimiter defaulted" info
    const parseErrors: ImportError[] = [];
    for (const err of rawResult.errors ?? []) {
      if (err.code === 'UndetectableDelimiter') continue; // harmless
      parseErrors.push({ row: (err.row ?? 0) + 2, message: err.message });
    }

    if (rawResult.data.length === 0) {
      return { ...this.failure([
        ...parseErrors,
        { row: 1, message: 'No data rows found in CSV. Make sure the file is not empty.' },
      ]), enrolled: 0 };
    }

    // ── Step 2: Normalize headers via alias map ──────────────────────────────
    const rows = (rawResult.data as Record<string, string>[]).map(remapRow);

    // ── Step 3: Verify minimum required fields are detectable ────────────────
    const sample = rows[0];
    const hasFirst = 'firstName' in sample;
    const hasLast  = 'lastName'  in sample;

    if (!hasFirst || !hasLast) {
      const detected = (rawResult.meta.fields ?? []).join(', ') || '(none)';
      return { ...this.failure([{
        row: 1,
        message:
          `Could not map required columns. ` +
          `Headers detected in your file: [${detected}]. ` +
          `Your file needs at minimum: "firstName" and "lastName" columns ` +
          `(any spelling variant is accepted, e.g. "First Name", "first_name", "FIRSTNAME").`,
      }]), enrolled: 0 };
    }

    // ── Step 4: Load existing admission numbers to avoid duplicates ──────────
    const providedNos = rows
      .map(r => r.admissionNumber?.trim())
      .filter((x): x is string => !!x);
    const existingSet = new Set<string>();
    if (providedNos.length > 0) {
      const existing = await this.prisma.student.findMany({
        where: { schoolId, admissionNumber: { in: providedNos } },
        select: { admissionNumber: true },
      });
      existing.forEach(s => existingSet.add(s.admissionNumber));
    }

    // ── Step 5: Build insert operations ─────────────────────────────────────
    const rowErrors: ImportError[] = [];
    const operations: any[] = [];
    const year   = new Date().getFullYear().toString().slice(-2);
    const prefix = schoolId.slice(0, 3).toUpperCase();

    // Get current highest sequence for auto-generated numbers
    const lastStudent = await this.prisma.student.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: { admissionNumber: true },
    });
    let autoSeq = lastStudent
      ? (parseInt(lastStudent.admissionNumber.slice(-4), 10) || 0) + 1
      : 1;

    for (let i = 0; i < rows.length; i++) {
      const row   = rows[i];
      const rowNum = i + 2;

      if (!row.firstName?.trim()) {
        rowErrors.push({ row: rowNum, column: 'firstName', message: 'First name is required' });
        continue;
      }
      if (!row.lastName?.trim()) {
        rowErrors.push({ row: rowNum, column: 'lastName', message: 'Last name is required' });
        continue;
      }

      // Use provided admission number, or auto-generate one
      let admNo = row.admissionNumber?.trim();
      if (!admNo) {
        admNo = `${prefix}${year}${String(autoSeq).padStart(4, '0')}`;
        autoSeq++;
      }

      if (existingSet.has(admNo)) {
        rowErrors.push({
          row: rowNum,
          column: 'admissionNumber',
          message: `Admission number "${admNo}" already exists — row skipped`,
          value: admNo,
        });
        continue;
      }
      existingSet.add(admNo); // prevent intra-batch duplicates

      operations.push(
        this.prisma.student.create({
          data: {
            schoolId,
            admissionNumber: admNo,
            firstName:   row.firstName.trim(),
            lastName:    row.lastName.trim(),
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
            gender:      row.gender?.trim()      || undefined,
            address:     row.address?.trim()     || undefined,
            phone:       row.phone?.trim()       || undefined,
            email:       row.email?.trim()       || undefined,
            parentName:  row.parentName?.trim()  || undefined,
            parentEmail: row.parentEmail?.trim() || undefined,
            parentPhone: row.parentPhone?.trim() || undefined,
            isActive: true,
            userId:   null,
          },
        }),
      );
    }

    // ── Step 6: Execute in batches of 50 ────────────────────────────────────
    let successCount = 0;
    const createdStudentIds: string[] = [];
    const batchSize = 50;
    for (let b = 0; b < operations.length; b += batchSize) {
      const batch   = operations.slice(b, b + batchSize);
      const created = await this.prisma.$transaction(batch);
      successCount += created.length;
      for (const s of created as any[]) {
        createdStudentIds.push(s.id);
      }
    }

    // ── Step 7: Auto-enroll if classId + termId provided ────────────────────
    let enrolledCount = 0;
    if (classId && termId && createdStudentIds.length > 0) {
      // Validate class and term exist for this school
      const [classEntity, termEntity] = await Promise.all([
        this.prisma.class.findFirst({ where: { id: classId, schoolId, deletedAt: null } }),
        this.prisma.term.findFirst({ where: { id: termId, schoolId, deletedAt: null } }),
      ]);

      if (classEntity && termEntity) {
        for (const studentId of createdStudentIds) {
          try {
            // Skip if already enrolled in this term (unique constraint: studentId_termId)
            const existing = await this.prisma.enrollment.findUnique({
              where: { studentId_termId: { studentId, termId } },
            });
            if (existing) continue;

            await this.prisma.enrollment.create({
              data: { studentId, classId, termId },
            });
            enrolledCount++;
          } catch {
            // Non-fatal — student was still created, just not enrolled
            this.logger.warn(`Could not auto-enroll student ${studentId} into class ${classId}`);
          }
        }
      } else {
        this.logger.warn(
          `Auto-enrollment skipped: class ${classId} or term ${termId} not found for school ${schoolId}`
        );
      }
    }

    const allErrors = [...parseErrors, ...rowErrors];
    const baseResult = allErrors.length > 0
      ? this.failure(allErrors, successCount)
      : this.success(successCount);

    // Attach enrollment count to the result object
    return { ...baseResult, enrolled: enrolledCount };
  }
}
