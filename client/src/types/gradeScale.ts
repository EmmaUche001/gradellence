export interface GradeScale {
  id: string;
  schoolId: string;
  minScore: number;
  maxScore: number;
  grade: string;
  remark: string;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeScaleData {
  minScore: number;
  maxScore: number;
  grade: string;
  remark: string;
  points?: number;
  isActive?: boolean;
}

export interface UpdateGradeScaleData extends Partial<CreateGradeScaleData> {}

// Batch update types
export interface UpdateGradeScaleEntry {
  id: string;
  grade?: string;
  minScore?: number;
  maxScore?: number;
  remark?: string;
  points?: number;
  isActive?: boolean;
}

export interface BatchUpdateGradeScaleData {
  scales: UpdateGradeScaleEntry[];
  validateOnly?: boolean;
}

export interface BatchCreateGradeScaleData {
  scales: CreateGradeScaleData[];
}
