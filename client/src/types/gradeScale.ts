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
