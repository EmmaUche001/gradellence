import apiClient, { ApiResponse } from './apiClient';
import { Role, Permission, CreateRoleData, UpdateRoleData, UserRoles } from '../types/role';

const BASE = '/v1/roles';

export const roleService = {
  async getAll(): Promise<ApiResponse<Role[]>> {
    const { data } = await apiClient.get(BASE);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Role>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateRoleData): Promise<ApiResponse<Role>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateRoleData): Promise<ApiResponse<Role>> {
    const { data } = await apiClient.patch(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  async getAllPermissions(): Promise<ApiResponse<Permission[]>> {
    const { data } = await apiClient.get(`${BASE}/permissions/all`);
    return data;
  },

  async getUserRoles(userId: string): Promise<ApiResponse<UserRoles>> {
    const { data } = await apiClient.get(`${BASE}/users/${userId}`);
    return data;
  },

  async updateUserRoles(userId: string, roleIds: string[]): Promise<ApiResponse<void>> {
    const { data } = await apiClient.patch(`${BASE}/users/${userId}`, { roleIds });
    return data;
  },
};