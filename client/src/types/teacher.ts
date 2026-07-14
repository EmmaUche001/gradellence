export interface Teacher {
  id: string;
  schoolId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  qualification: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  classTeacher?: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  subjectAssignments?: Array<{
    id: string;
    subject: { id: string; name: string; code: string };
    class: { id: string; name: string };
  }>;
}

export interface CreateTeacherData {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  email?: string;
  qualification?: string;
}

export interface UpdateTeacherData extends Partial<CreateTeacherData> {
  isActive?: boolean;
}

export interface AssignTeacherSubjectData {
  teacherId: string;
  subjectId: string;
  classId: string;
}