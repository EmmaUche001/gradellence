import { GradeScaleEntry } from '../../../modules/results/grading.util';

/**
 * Normalised, tenant-scoped view of a school's ReportCardConfig.
 * All JSON fields are already parsed into string arrays.
 */
export interface ReportCardBranding {
  template: string;
  accentColor: string;
  motto: string | null;
  principalName: string | null;
  principalSignature: string | null;
  schoolStamp: string | null;
  showRanking: boolean;
  showCumulative: boolean;
  showAffective: boolean;
  showPsychomotor: boolean;
  showTeacherRemark: boolean;
  showPrincipalRemark: boolean;
  showResumptionDate: boolean;
  showStamp: boolean;
  showPoweredBy: boolean;
  affectiveTraits: string[];
  psychomotorTraits: string[];
  footerText: string | null;
  nextTermDate: string | null;
}

export interface ReportCardResultRow {
  subjectName: string;
  totalScore: number;
  grade: string | null;
  remark: string | null;
  points: number | null;
}

export interface ReportCardSummary {
  subjectCount: number;
  totalScore: number;
  average: number;
  overallGrade: string | null;
  gpa: number;
  position: number | null;
  classSize: number | null;
  cumulativeGpa: number | null;
}

export interface ReportCardData {
  school: {
    name: string;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    signatureUrl: string | null;
  };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  className: string;
  termName: string;
  sessionName: string;
  results: ReportCardResultRow[];
  summary: ReportCardSummary;
  branding: ReportCardBranding;
  gradeScales: GradeScaleEntry[];
  qrDataUrl: string | null;
}

export interface ReportCardTemplate {
  readonly name: string;
  render(doc: any, data: ReportCardData): Promise<void>;
}

export function asStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return fallback;
}
