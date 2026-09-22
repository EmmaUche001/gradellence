import apiClient, { ApiResponse } from './apiClient';
import { ReportCardConfig, UpdateReportCardConfigDto } from '../types/report-card-config';

const BASE = '/v1/report-card-config';

export const reportCardConfigService = {
  async getConfig(): Promise<ApiResponse<ReportCardConfig>> {
    const { data } = await apiClient.get(BASE);
    return data;
  },

  async updateConfig(dto: UpdateReportCardConfigDto): Promise<ApiResponse<ReportCardConfig>> {
    const { data } = await apiClient.put(BASE, dto);
    return data;
  },

  async uploadImage(
    field: 'principalSignature' | 'schoolStamp',
    file: File,
  ): Promise<ApiResponse<{ field: string; url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `${BASE}/upload/${field}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};