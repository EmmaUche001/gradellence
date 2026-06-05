export interface Class {
  id: string;
  schoolId: string;
  name: string;
  academicYear: string;
  classTeacherId: string | null;
  capacity: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  classTeacher?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    students: number;
  };
}

export interface CreateClassData {
  name: string;
  academicYear: string;
  classTeacherId?: string;
  capacity?: number;
  description?: string;
}

export interface UpdateClassData extends Partial<CreateClassData> {
  isActive?: boolean;
}