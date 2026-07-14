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