export interface Subject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateSubjectData {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateSubjectData extends Partial<CreateSubjectData> {
  isActive?: boolean;
}