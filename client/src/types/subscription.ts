export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  priceNGN: number;
  duration: number;
  maxStudents: number;
  maxUsers: number;
  maxBranches: number;
  storageGB: number;
  features: Record<string, boolean>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSubscription {
  id: string;
  schoolId: string;
  planId: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'TRIAL';
  autoRenew: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribeResponse {
  id: string;
  status: string;
  plan: SubscriptionPlan;
}