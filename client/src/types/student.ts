export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  parentName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Most recent enrollment — included by the server's findAll query */
  enrollments?: Array<{
    id: string;
    classId: string;
    termId: string;
    class: { id: string; name: string; level: number } | null;
    term:  { id: string; name: string } | null;
  }>;
}

export interface CreateStudentData {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  email?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  classId?: string;
}

export interface UpdateStudentData extends Partial<CreateStudentData> {}