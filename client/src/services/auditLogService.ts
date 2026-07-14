import apiClient, { ApiResponse } from './apiClient';
import { AuditLog } from '../types/auditLog';

const BASE = '/v1/audit-logs';

export const auditLogService = {
  async getAll(
    page = 1,
    limit = 20,
    filters?: { actorId?: string; action?: string; entityType?: string; entityId?: string; startDate?: string; endDate?: string },
  ): Promise<ApiResponse<AuditLog[]>> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.actorId) params.append('actorId', filters.actorId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.entityId) params.append('entityId', filters.entityId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const { data } = await apiClient.get(`${BASE}?${params}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<AuditLog>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },
};