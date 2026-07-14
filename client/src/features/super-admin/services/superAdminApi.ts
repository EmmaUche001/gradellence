import apiClient from '../../../services/apiClient';
import type { School, SchoolDetails, Plan, PlatformStats, RevenueData } from '../types';

export const superAdminApi = {
  // ── Schools ──────────────────────────────────────────
  getAllSchools(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    return apiClient.get<{ data: School[]; meta: { total: number; page: number; limit: number } }>(
      `/super-admin/schools?${q.toString()}`,
    );
  },

  getSchoolById(id: string) {
    return apiClient.get<{ data: SchoolDetails }>(`/super-admin/schools/${id}`);
  },

  suspendSchool(id: string) {
    return apiClient.post(`/super-admin/schools/${id}/suspend`);
  },

  reactivateSchool(id: string) {
    return apiClient.post(`/super-admin/schools/${id}/reactivate`);
  },

  deleteSchool(id: string) {
    return apiClient.delete(`/super-admin/schools/${id}`);
  },

  // ── Subscription Plans ───────────────────────────────
  getAllPlans() {
    return apiClient.get<{ data: Plan[] }>('/super-admin/subscriptions/plans');
  },

  createPlan(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) {
    return apiClient.post<{ data: Plan }>('/super-admin/subscriptions/plans', data);
  },

  updatePlan(id: string, data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>) {
    return apiClient.patch<{ data: Plan }>(`/super-admin/subscriptions/plans/${id}`, data);
  },

  deletePlan(id: string) {
    return apiClient.delete(`/super-admin/subscriptions/plans/${id}`);
  },

  seedDefaultPlans() {
    return apiClient.post<{ message: string; count: number }>('/subscriptions/seed-defaults');
  },

  getAllSubscriptions(params?: { page?: number; limit?: number; status?: string; planId?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.status) q.append('status', params.status);
    if (params?.planId) q.append('planId', params.planId);
    return apiClient.get(`/super-admin/subscriptions?${q.toString()}`);
  },

  // ── Platform Analytics ───────────────────────────────
  getPlatformStats() {
    return apiClient.get<{ data: PlatformStats }>('/super-admin/analytics/overview');
  },

  getRevenueStats(period: '7d' | '30d' | '90d' | '1y' = '30d') {
    return apiClient.get<{ data: RevenueData }>(`/super-admin/analytics/revenue?period=${period}`);
  },
};