import apiClient, { ApiResponse } from './apiClient';

const BASE = '/v1/analytics';

export interface OverviewData {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  activeSession: { id: string; name: string } | null;
  currentTerm: { id: string; name: string } | null;
}

export interface ResultStatsData {
  totalResults: number;
  publishedResults: number;
  passRate: number;
  averageScore: number;
  subjectPerformance: {
    subjectId: string;
    subjectName: string;
    averageScore: number;
    passRate: number;
  }[];
}

export interface ClassRankingItem {
  position: number;
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  totalScore: number;
  averageScore: number;
}

export const analyticsService = {
  async getOverview(): Promise<ApiResponse<OverviewData>> {
    const { data } = await apiClient.get(`${BASE}/overview`);
    return data;
  },

  async getResultStats(termId?: string): Promise<ApiResponse<ResultStatsData>> {
    const params = termId ? `?termId=${termId}` : '';
    const { data } = await apiClient.get(`${BASE}/results${params}`);
    return data;
  },

  async getClassRankings(classId: string, termId: string): Promise<ApiResponse<ClassRankingItem[]>> {
    const { data } = await apiClient.get(`${BASE}/class-rankings/${classId}?termId=${termId}`);
    return data;
  },
};