import apiClient, { ApiResponse } from './apiClient';
import { Session, CreateSessionData, UpdateSessionData, CreateTermData, UpdateTermData, Term, CreateSessionWithTermsData } from '../types/session';

const BASE = '/v1/sessions';

export const sessionService = {
  async getAll(page = 1, limit = 20): Promise<ApiResponse<Session[]>> {
    const { data } = await apiClient.get(`${BASE}?page=${page}&limit=${limit}`);
    return data;
  },

  async getById(id: string): Promise<ApiResponse<Session>> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return data;
  },

  async create(dto: CreateSessionData): Promise<ApiResponse<Session>> {
    const { data } = await apiClient.post(BASE, dto);
    return data;
  },

  async update(id: string, dto: UpdateSessionData): Promise<ApiResponse<Session>> {
    const { data } = await apiClient.put(`${BASE}/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  // Terms
  async getTerms(sessionId: string): Promise<ApiResponse<Term[]>> {
    const { data } = await apiClient.get(`${BASE}/${sessionId}/terms`);
    return data;
  },

  async addTerm(dto: CreateTermData): Promise<ApiResponse<Term>> {
    const { data } = await apiClient.post(`${BASE}/${dto.sessionId}/terms`, dto);
    return data;
  },

  async updateTerm(termId: string, dto: UpdateTermData): Promise<ApiResponse<Term>> {
    const { data } = await apiClient.put(`${BASE}/terms/${termId}`, dto);
    return data;
  },

  async removeTerm(termId: string): Promise<ApiResponse<void>> {
    const { data } = await apiClient.delete(`${BASE}/terms/${termId}`);
    return data;
  },

  async createWithTerms(dto: CreateSessionWithTermsData): Promise<ApiResponse<Session>> {
    const { data } = await apiClient.post(`${BASE}/with-terms`, dto);
    return data;
  },

  async setCurrentSession(id: string): Promise<ApiResponse<Session>> {
    const { data } = await apiClient.patch(`${BASE}/${id}/set-current`);
    return data;
  },

  async setCurrentTerm(id: string): Promise<ApiResponse<Term>> {
    const { data } = await apiClient.patch(`${BASE}/terms/${id}/set-current`);
    return data;
  },
};
