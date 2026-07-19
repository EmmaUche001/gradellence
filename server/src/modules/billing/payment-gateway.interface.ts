export interface PaymentGateway {
  initializeTransaction(params: {
    email: string;
    amount: number;
    reference: string;
    metadata: Record<string, any>;
  }): Promise<{ authorizationUrl: string; reference: string }>;

  verifyTransaction(reference: string): Promise<{
    status: 'success' | 'failed' | 'pending';
    amount: number;
    paidAt: Date | null;
    paymentMethod: string;
  }>;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
