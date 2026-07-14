import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway } from './payment-gateway.interface';

@Injectable()
export class PaystackGateway implements PaymentGateway {
  private readonly logger = new Logger(PaystackGateway.name);
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
    this.publicKey = this.configService.get<string>('PAYSTACK_PUBLIC_KEY', '');
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  async initializeTransaction(params: {
    email: string;
    amount: number;
    reference: string;
    metadata: Record<string, any>;
  }): Promise<{ authorizationUrl: string; reference: string }> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        reference: params.reference,
        metadata: params.metadata,
        callback_url: `${this.configService.get('FRONTEND_URL', 'http://localhost:5173')}/billing`,
      }),
    });

    const result = await response.json();

    if (!result.status) {
      this.logger.error(`Paystack init failed: ${result.message}`);
      throw new HttpException(
        result.message || 'Payment initialization failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      authorizationUrl: result.data.authorization_url,
      reference: result.data.reference,
    };
  }

  async verifyTransaction(reference: string): Promise<{
    status: 'success' | 'failed' | 'pending';
    amount: number;
    paidAt: Date | null;
    paymentMethod: string;
  }> {
    const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.status) {
      this.logger.error(`Paystack verify failed: ${result.message}`);
      throw new HttpException(
        result.message || 'Payment verification failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = result.data;
    const paystackStatus = data.status;

    let mappedStatus: 'success' | 'failed' | 'pending';
    if (paystackStatus === 'success') {
      mappedStatus = 'success';
    } else if (['failed', 'reversed'].includes(paystackStatus)) {
      mappedStatus = 'failed';
    } else {
      mappedStatus = 'pending';
    }

    return {
      status: mappedStatus,
      amount: data.amount,
      paidAt: data.paid_at ? new Date(data.paid_at) : null,
      paymentMethod: data.channel || 'unknown',
    };
  }
}