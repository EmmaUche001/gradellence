import apiClient, { ApiResponse } from './apiClient';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Silent client — no error toasts for notification background polling
const silentClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});
silentClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Notification {
  id: string;
  userId: string;
  schoolId: string;
  type: 'RESULT_PUBLISHED' | 'ASSIGNMENT' | 'ANNOUNCEMENT' | 'ROLE_CHANGED' | 'SYSTEM';
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const BASE = '/v1/notifications';

export const notificationService = {
  // Uses silent client — no toast on poll failure
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const { data } = await silentClient.get(`${BASE}/unread-count`);
    return data;
  },

  // Uses silent client — inbox loads silently when dropdown opens
  async getInbox(page = 1, limit = 20): Promise<ApiResponse<Notification[]>> {
    const { data } = await silentClient.get(`${BASE}?page=${page}&limit=${limit}`);
    return data;
  },

  // Uses apiClient — user-triggered, toasts on error are appropriate
  async markRead(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.patch(`${BASE}/${id}/read`);
    return data;
  },

  async markAllRead(): Promise<ApiResponse<void>> {
    const { data } = await apiClient.patch(`${BASE}/read-all`);
    return data;
  },
};
