export interface Assessment {
  id: string;
  schoolId: string;
  studentId: string;
  subjectId: string;
  termId: string;
  classId: string;
  type: 'CA1' | 'CA2' | 'CA3' | 'EXAM' | string;
  score: number;
  maxScore: number;
  weight: number | null;
  isPublished: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  class?: {
    id: string;
    name: string;
    academicYear: string;
  };
  term?: {
    id: string;
    name: string;
  };
}

export interface CreateAssessmentData {
  studentId: string;
  subjectId: string;
  termId: string;
  classId: string;
  type: string;
  score: number;
  maxScore: number;
  weight?: number;
  remarks?: string;
}

export interface UpdateAssessmentData extends Partial<CreateAssessmentData> {
  isPublished?: boolean;
}

export interface BulkAssessmentData {
  classId: string;
  subjectId: string;
  termId: string;
  type: string;
  maxScore: number;
  assessments: Array<{ studentId: string; score: number; weight?: number }>;
}