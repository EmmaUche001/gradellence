import apiClient, { ApiResponse } from './apiClient';
import { Student, CreateStudentData, UpdateStudentData } from '../types/student';

const BASE = '/v1/students';

export const studentService = {
  async getAll(page = 1, limit = 20, search?: string): Promise<ApiResponse<Student[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Student>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateStudentData): Promise<ApiResponse<Student>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateStudentData): Promise<ApiResponse<Student>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  async bulkRemove(ids: string[]): Promise<ApiResponse<{ deleted: number; notFound: number }>> {
    const { data } = await apiClient.delete(`${BASE}/bulk`, { data: { ids } });
    return data;
  },
};