import apiClient, { ApiResponse } from './apiClient';
import { Class, CreateClassData, UpdateClassData } from '../types/class';
import { Subject } from '../types/subject';

const BASE = '/v1/classes';

export const classService = {
  async getAll(page = 1, limit = 20, search?: string): Promise<ApiResponse<Class[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Class>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateClassData): Promise<ApiResponse<Class>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateClassData): Promise<ApiResponse<Class>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  async assignSubjects(id: string, subjectIds: string[]): Promise<ApiResponse<any>> {
    const { data } = await apiClient.post(`${BASE}/${id}/subjects`, { subjectIds });
    return data;
  },

  async getClassSubjects(id: string): Promise<ApiResponse<Subject[]>> {
    const { data } = await apiClient.get(`${BASE}/${id}/subjects`);
    return data;
  },
};
