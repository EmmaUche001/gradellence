import apiClient, { ApiResponse } from './apiClient';
import { Invoice } from '../types/billing';

const BASE = '/v1/billing';

export const billingService = {
  async getInvoices(): Promise<ApiResponse<Invoice[]>> {
    const { data } = await apiClient.get(`${BASE}/invoices`);
    return data;
  },

  async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
    const { data } = await apiClient.get(`${BASE}/invoices/${id}`);
    return data;
  },
};