export interface Result {
  id: string;
  schoolId: string;
  studentId: string;
  subjectId: string;
  termId: string;
  totalScore: number;
  grade: string | null;
  remark: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  term?: {
    id: string;
    name: string;
    session: {
      id: string;
      name: string;
    };
  };
}

export interface ComputeResultData {
  classId: string;
  termId: string;
  subjectIds?: string[];
}

export interface PublishResultData {
  classId: string;
  termId: string;
  subjectIds?: string[];
}

export interface StudentResultSummary {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  results: Result[];
  summary: {
    totalSubjects: number;
    averageScore: number;
    passedSubjects: number;
    failedSubjects: number;
  };
}

export interface BroadsheetEntry {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  subjectScores: Record<string, { score: number; grade: string | null }>;
  totalScore: number;
  averageScore: number;
  position: number;
}

export interface BroadsheetData {
  class: { id: string; name: string; level?: number };
  subjects: Array<{ id: string; name: string; code: string }>;
  students: BroadsheetEntry[];
}