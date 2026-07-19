import apiClient, { ApiResponse } from './apiClient';
import { Announcement, CreateAnnouncementData, UpdateAnnouncementData } from '../types/announcement';

const BASE = '/v1/announcements';

export const announcementService = {
  async getAll(page = 1, limit = 10): Promise<ApiResponse<Announcement[]>> {
    const { data } = await apiClient.get(`${BASE}?page=${page}&limit=${limit}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Announcement>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateAnnouncementData): Promise<ApiResponse<Announcement>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateAnnouncementData): Promise<ApiResponse<Announcement>> {
    const { data } = await apiClient.patch(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },
};
