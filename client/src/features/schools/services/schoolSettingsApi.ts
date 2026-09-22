import apiClient from '../../../services/apiClient';

export interface AcademicSettings {
  id?: string;
  schoolId?: string;
  gradingSystem: 'PERCENTAGE' | 'GRADE_POINT' | 'LETTER_GRADE';
  passMark: number;
  caWeight: number;
  examWeight: number;
  maxScore: number;
  showPosition: boolean;
  showGrade: boolean;
  showRemark: boolean;
  resultTemplate: 'STANDARD' | 'DETAILED' | 'COMPACT';
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicSettingsResponse {
  success: boolean;
  message: string;
  data: AcademicSettings;
}

export const schoolSettingsApi = {
  getSettings: async (schoolId: string): Promise<AcademicSettingsResponse> => {
    const response = await apiClient.get(`/schools/${schoolId}/settings`);
    return response.data;
  },

  updateSettings: async (
    schoolId: string,
    settings: Partial<AcademicSettings>
  ): Promise<AcademicSettingsResponse> => {
    const response = await apiClient.patch(`/schools/${schoolId}/settings`, settings);
    return response.data;
  },
};
