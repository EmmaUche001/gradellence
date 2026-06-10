export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  termId: string;
  enrollmentDate: string;
  isActive: boolean;
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
    academicYear: string;
  };
  term?: {
    id: string;
    name: string;
    session: {
      name: string;
    };
  };
}

export interface CreateEnrollmentData {
  studentId: string;
  classId: string;
  termId: string;
  enrollmentDate?: string;
}

export interface UpdateEnrollmentData {
  classId?: string;
  termId?: string;
  isActive?: boolean;
}

export interface BulkEnrollmentData {
  studentIds: string[];
  classId: string;
  termId: string;
}