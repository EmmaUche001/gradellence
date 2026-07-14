import apiClient, { ApiResponse } from './apiClient';
import { SubscriptionPlan, SchoolSubscription } from '../types/subscription';

const BASE = '/v1/subscriptions';

export const subscriptionService = {
  async getAllPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    const { data } = await apiClient.get(`${BASE}/plans`);
    return data;
  },

  async getMyPlan(): Promise<ApiResponse<SchoolSubscription>> {
    const { data } = await apiClient.get(`${BASE}/my-plan`);
    return data;
  },

  async subscribe(planId: string): Promise<ApiResponse<SchoolSubscription>> {
    const { data } = await apiClient.post(`${BASE}/subscribe/${planId}`);
    return data;
  },

  async cancel(): Promise<ApiResponse<void>> {
    const { data } = await apiClient.post(`${BASE}/cancel`);
    return data;
  },
};