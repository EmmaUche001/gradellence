import apiClient, { ApiResponse } from './apiClient';
import {
  Result,
  ComputeResultData,
  PublishResultData,
  StudentResultSummary,
  BroadsheetData,
} from '../types/result';

const BASE = '/v1/results';

export const resultService = {
  async getAll(
    page = 1,
    limit = 20,
    filters?: { studentId?: string; subjectId?: string; termId?: string; isPublished?: boolean },
  ): Promise<ApiResponse<Result[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.subjectId) params.append('subjectId', filters.subjectId);
    if (filters?.termId) params.append('termId', filters.termId);
    if (filters?.isPublished !== undefined) params.append('isPublished', String(filters.isPublished));
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Result>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async compute(dto: ComputeResultData): Promise<ApiResponse<{ computedCount: number; studentCount: number; subjectCount: number }>> {
    const { data } = await apiClient.post(`${BASE}/compute/${dto.classId}/${dto.termId}`, {
      subjectIds: dto.subjectIds,
    });
    return data;
  },

  async publish(dto: PublishResultData): Promise<ApiResponse<{ publishedCount: number }>> {
    const { data } = await apiClient.post(`${BASE}/publish`, dto);
    return data;
  },

  async unpublish(dto: PublishResultData): Promise<ApiResponse<{ unpublishedCount: number }>> {
    const { data } = await apiClient.post(`${BASE}/unpublish`, dto);
    return data;
  },

  async getStudentResults(studentId: string, termId: string): Promise<ApiResponse<StudentResultSummary>> {
    const { data } = await apiClient.get(`${BASE}/student/${studentId}/${termId}`);
    return data;
  },

  async getClassResults(classId: string, termId: string): Promise<ApiResponse<any>> {
    const { data } = await apiClient.get(`${BASE}/class/${classId}/${termId}`);
    return data;
  },

  async getBroadsheet(classId: string, termId: string): Promise<ApiResponse<BroadsheetData>> {
    const { data } = await apiClient.get(`${BASE}/broadsheet/${classId}/${termId}`);
    return data;
  },

  async downloadClassReportCards(classId: string, termId: string) {
    return apiClient.get(`${BASE}/report-cards/class/${classId}/${termId}`, {
      responseType: 'blob',
    });
  },
};
