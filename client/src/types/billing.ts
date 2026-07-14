export interface Invoice {
  id: string;
  schoolId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentRef: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  dueDate: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    plan: { name: string };
  };
}