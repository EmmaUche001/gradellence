import apiClient, { ApiResponse } from './apiClient';
import { Assessment, CreateAssessmentData, UpdateAssessmentData, BulkAssessmentData } from '../types/assessment';

const BASE = '/v1/assessments';

export const assessmentService = {
  async getAll(page = 1, limit = 20, filters?: { classId?: string; subjectId?: string; termId?: string }): Promise<ApiResponse<Assessment[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.classId) params.append('classId', filters.classId);
    if (filters?.subjectId) params.append('subjectId', filters.subjectId);
    if (filters?.termId) params.append('termId', filters.termId);
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Assessment>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateAssessmentData): Promise<ApiResponse<Assessment>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateAssessmentData): Promise<ApiResponse<Assessment>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  async publish(id: string): Promise<ApiResponse<Assessment>> {
    const { data } = await apiClient.post(`${BASE}/${id}/publish`, {});
    return data;
  },

  async bulkCreate(dto: BulkAssessmentData): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post(`${BASE}/bulk`, dto);
    return data;
  },
};