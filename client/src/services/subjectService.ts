import apiClient, { ApiResponse } from './apiClient';
import { Subject, CreateSubjectData, UpdateSubjectData } from '../types/subject';

const BASE = '/v1/subjects';

export const subjectService = {
  async getAll(page = 1, limit = 20, search?: string): Promise<ApiResponse<Subject[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Subject>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateSubjectData): Promise<ApiResponse<Subject>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateSubjectData): Promise<ApiResponse<Subject>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },
};