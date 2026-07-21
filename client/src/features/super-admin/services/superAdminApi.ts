import apiClient from '../../../services/apiClient';
import type { School, SchoolDetails, Plan, PlatformStats, RevenueData } from '../types';

const BASE = '/v1/super-admin';

export const superAdminApi = {
  // ── Schools ──────────────────────────────────────────
  getAllSchools(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    return apiClient.get<{ data: School[]; meta: { total: number; page: number; limit: number } }>(
      `${BASE}/schools?${q.toString()}`,
    );
  },

  getSchoolById(id: string) {
    return apiClient.get<{ data: SchoolDetails }>(`${BASE}/schools/${id}`);
  },

  suspendSchool(id: string) {
    return apiClient.post(`${BASE}/schools/${id}/suspend`);
  },

  reactivateSchool(id: string) {
    return apiClient.post(`${BASE}/schools/${id}/reactivate`);
  },

  deleteSchool(id: string) {
    return apiClient.delete(`${BASE}/schools/${id}`);
  },

  // ── Subscription Plans ───────────────────────────────
  getAllPlans() {
    return apiClient.get<{ data: Plan[] }>('/v1/subscriptions/plans');
  },

  createPlan(data: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>) {
    return apiClient.post<{ data: Plan }>('/v1/subscriptions/plans', data);
  },

  updatePlan(id: string, data: Partial<Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>>) {
    return apiClient.post<{ data: Plan }>(`/v1/subscriptions/plans/${id}`, data);
  },

  deletePlan(id: string) {
    return apiClient.delete(`/v1/subscriptions/plans/${id}`);
  },

  seedDefaultPlans() {
    return apiClient.post<{ message: string; count: number }>('/v1/subscriptions/seed-defaults');
  },

  getAllSubscriptions(params?: { page?: number; limit?: number; status?: string; planId?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.status) q.append('status', params.status);
    if (params?.planId) q.append('planId', params.planId);
    return apiClient.get(`${BASE}/subscriptions?${q.toString()}`);
  },

  getAllSchoolSubscriptions(params?: { page?: number; limit?: number; status?: string; planId?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.status) q.append('status', params.status);
    if (params?.planId) q.append('planId', params.planId);
    return apiClient.get<{ data: any[]; meta: { total: number; page: number; limit: number } }>(
      `${BASE}/school-subscriptions?${q.toString()}`
    );
  },

  getSubscriptionPlans() {
    return apiClient.get<{ data: Plan[] }>(`${BASE}/subscription-plans`);
  },

  assignPlanToSchool(schoolId: string, planId: string) {
    return apiClient.post(`${BASE}/schools/${schoolId}/assign-plan`, { planId });
  },

  cancelSchoolSubscription(schoolId: string) {
    return apiClient.post(`${BASE}/schools/${schoolId}/cancel-subscription`, {});
  },

  getPlatformAuditLogs(params?: { page?: number; limit?: number; action?: string; entityType?: string }) {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.action) q.append('action', params.action);
    if (params?.entityType) q.append('entityType', params.entityType);
    return apiClient.get<{ data: any[]; meta: { total: number; page: number; limit: number } }>(
      `${BASE}/audit-logs?${q.toString()}`
    );
  },

  // ── Platform Analytics ───────────────────────────────
  getPlatformStats() {
    return apiClient.get<{ data: PlatformStats }>(`${BASE}/analytics/overview`);
  },

  getRevenueStats(period: '7d' | '30d' | '90d' | '1y' = '30d') {
    return apiClient.get<{ data: RevenueData }>(`${BASE}/analytics/revenue?period=${period}`);
  },
};