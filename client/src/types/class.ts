export interface Class {
  id: string;
  schoolId: string;
  name: string;
  level: number;
  stream: string | null;
  classTeacherId: string | null;
  capacity: number | null;
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
    enrollments?: number;
    subjects?: number;
  };
}

export interface CreateClassData {
  names: string;
  stream?: string;
}

export interface UpdateClassData extends Partial<CreateClassData> {
  isActive?: boolean;
}