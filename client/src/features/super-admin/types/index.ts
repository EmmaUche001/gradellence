export interface School {
  id: string;
  name: string;
  alias?: string;
  slug: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  signatureUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  _count?: { users: number; students: number; teachers: number };
}

export interface SchoolSubscription {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'TRIAL';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  trialEndsAt?: string;
  cancelledAt?: string;
  plan: {
    id: string;
    name: string;
    priceNGN: number;
    duration: number;
    maxStudents: number;
    maxUsers: number;
    maxBranches: number;
    storageGB: number;
  };
}

export interface SchoolDetails extends School {
  subscriptions?: SchoolSubscription[];
  users: any[];
  students: any[];
  teachers: any[];
}

// Keep legacy alias used in other places
export interface Subscription {
  id: string;
  schoolId: string;
  planId: string;
  plan: { id: string; name: string; priceNGN: number; duration: number; maxStudents: number; maxUsers: number; features: Record<string, any> };
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING' | 'TRIAL';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  trialEndsAt?: string;
  cancelledAt?: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  priceNGN: number;
  duration: number;
  maxStudents: number;
  maxUsers: number;
  maxBranches: number;
  storageGB: number;
  features: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformStats {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
}

export interface RevenueData {
  labels: string[];
  revenue: number[];
  subscriptions: number[];
}