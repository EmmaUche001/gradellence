import apiClient, { ApiResponse } from './apiClient';
import { User, CreateUserData, UpdateUserData } from '../types/user';

const BASE = '/v1/users';

export const userService = {
  async getAll(page = 1, limit = 20): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<User>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateUserData): Promise<ApiResponse<User>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateUserData): Promise<ApiResponse<User>> {
    const { data } = await apiClient.patch(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },
};