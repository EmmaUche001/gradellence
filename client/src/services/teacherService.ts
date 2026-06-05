import apiClient, { ApiResponse } from './apiClient';
import { Teacher, CreateTeacherData, UpdateTeacherData, AssignTeacherSubjectData } from '../types/teacher';

const BASE = '/v1/teachers';

export const teacherService = {
  async getAll(page = 1, limit = 20, search?: string): Promise<ApiResponse<Teacher[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Teacher>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateTeacherData): Promise<ApiResponse<Teacher>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateTeacherData): Promise<ApiResponse<Teacher>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  async assignSubject(dto: AssignTeacherSubjectData): Promise<ApiResponse<void>> {
    const { data } = await apiClient.post(`${BASE}/assign-subject`, dto);
    return data;
  },

  async removeSubjectAssignment(teacherId: string, subjectId: string, classId: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${teacherId}/subjects/${subjectId}/classes/${classId}`);
    return data;
  },

  async getAssignments(id: string): Promise<ApiResponse<any[]>> {
    const { data } = await apiClient.get(`${BASE}/${id}/assignments`);
    return data;
  },
};