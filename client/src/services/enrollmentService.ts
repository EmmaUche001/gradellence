import apiClient, { ApiResponse } from './apiClient';
import { Enrollment, CreateEnrollmentData, UpdateEnrollmentData, BulkEnrollmentData } from '../types/enrollment';

const BASE = '/v1/enrollments';

export const enrollmentService = {
  async getAll(page = 1, limit = 20, classId?: string, termId?: string): Promise<ApiResponse<Enrollment[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (classId) params.append('classId', classId);
    if (termId) params.append('termId', termId);
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Enrollment>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateEnrollmentData): Promise<ApiResponse<Enrollment>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateEnrollmentData): Promise<ApiResponse<Enrollment>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  async getClassEnrollments(classId: string, termId?: string): Promise<ApiResponse<Enrollment[]>> {
    const params = termId ? `?termId=${termId}` : '';
    const { data } = await apiClient.get(`${BASE}/class/${classId}${params}`);
    return data;
  },

  async bulkEnroll(dto: BulkEnrollmentData): Promise<ApiResponse<{ count: number }>> {
    const { data } = await apiClient.post(`${BASE}/bulk`, dto);
    return data;
  },
};