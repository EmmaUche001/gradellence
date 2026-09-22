import apiClient, { ApiResponse } from './apiClient';
import {
  GradeScale,
  CreateGradeScaleData,
  UpdateGradeScaleData,
  BatchUpdateGradeScaleData,
} from '../types/gradeScale';

const BASE = '/v1/grade-scales';

export const gradeScaleService = {
  async getAll(page = 1, limit = 50): Promise<ApiResponse<GradeScale[]>> {
    const { data } = await apiClient.get(`${BASE}?page=${page}&limit=${limit}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<GradeScale>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateGradeScaleData): Promise<ApiResponse<GradeScale>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateGradeScaleData): Promise<ApiResponse<GradeScale>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  // Batch operations
  async createBatch(scales: CreateGradeScaleData[]): Promise<ApiResponse<GradeScale[]>> {
    const { data } = await apiClient.post(`${BASE}/batch`, { scales });
    return data;
  },

  async updateBatch(data: BatchUpdateGradeScaleData): Promise<ApiResponse<GradeScale[]>> {
    const { data: response } = await apiClient.put(`${BASE}/batch`, data);
    return response;
  },

  async validateBatch(data: BatchUpdateGradeScaleData): Promise<{ success: boolean; message: string; data: any[] }> {
    const { data: response } = await apiClient.put(`${BASE}/batch`, { ...data, validateOnly: true });
    return response;
  },
};
