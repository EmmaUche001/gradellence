import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaystackWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-paystack-signature'];

    if (!signature) {
      throw new ForbiddenException('Missing Paystack signature');
    }

    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
    const rawBody = request.rawBody || JSON.stringify(request.body);

    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (hash !== signature) {
      throw new ForbiddenException('Invalid Paystack signature');
    }

    return true;
  }
}
