export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  termId: string;
  status: string;        // ACTIVE, INACTIVE etc.
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
  };
  class?: {
    id: string;
    name: string;
    level: number;
  };
  term?: {
    id: string;
    name: string;
    session?: {
      name: string;
    };
  };
}

export interface CreateEnrollmentData {
  studentId: string;
  classId: string;
  termId: string;
}

export interface UpdateEnrollmentData {
  classId?: string;
  termId?: string;
  status?: string;
}

export interface BulkEnrollmentData {
  studentIds: string[];
  classId: string;
  termId: string;
}