import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SubscriptionRepository } from '../../infra/database/repositories/subscription.repository';

@Injectable()
export class PayhereService {
  private readonly logger = new Logger(PayhereService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly subscriptionRepo: SubscriptionRepository,
  ) {}

  private md5(value: string): string {
    return crypto.createHash('md5').update(value).digest('hex');
  }

  generateHash(
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
  ): string {
    const merchantSecret =
      this.configService.get<string>('PAYHERE_MERCHANT_SECRET') ?? '';
    const hashedSecret = this.md5(merchantSecret).toUpperCase();
    const raw = `${merchantId}${orderId}${amount}${currency}${hashedSecret}`;
    return this.md5(raw).toUpperCase();
  }

  buildCheckoutParams(data: {
    orderId: string;
    amount: number;
    currency: string;
    itemName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  }) {
    const merchantId =
      this.configService.get<string>('PAYHERE_MERCHANT_ID') ?? '';
    const sandbox =
      this.configService.get<string>('PAYHERE_SANDBOX') === 'true';

    // PayHere merchant IDs are numeric strings (e.g. "1216238").
    // If not configured or looks like a placeholder, return a dev-bypass flag
    // so the frontend can simulate the payment without hitting PayHere.
    const isValidMerchantId = /^\d+$/.test(merchantId.trim());
    if (!merchantId || !isValidMerchantId) {
      this.logger.warn(
        `PAYHERE_MERCHANT_ID is not set or is not a valid numeric merchant ID ("${merchantId}"). ` +
          `Returning dev-bypass params — update PAYHERE_MERCHANT_ID with your real sandbox/production ID.`,
      );
      return {
        devBypass: true,
        sandbox,
        merchant_id: '',
        order_id: data.orderId,
        items: data.itemName,
        amount: data.amount.toFixed(2),
        currency: data.currency,
      };
    }

    const amountFormatted = data.amount.toFixed(2);
    const hash = this.generateHash(
      merchantId,
      data.orderId,
      amountFormatted,
      data.currency,
    );

    return {
      sandbox,
      merchant_id: merchantId,
      return_url:
        this.configService.get<string>('PAYHERE_RETURN_URL') ||
        'http://localhost:3000/dashboard/billing?status=success',
      cancel_url:
        this.configService.get<string>('PAYHERE_CANCEL_URL') ||
        'http://localhost:3000/dashboard/billing?status=cancel',
      notify_url:
        this.configService.get<string>('PAYHERE_NOTIFY_URL') ||
        'http://localhost:5002/payhere/notify',
      order_id: data.orderId,
      items: data.itemName,
      amount: amountFormatted,
      currency: data.currency,
      hash,
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
    };
  }

  async handleNotify(
    body: Record<string, string>,
  ): Promise<{ success: boolean }> {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = body;

    const merchantSecret =
      this.configService.get<string>('PAYHERE_MERCHANT_SECRET') ?? '';
    const hashedSecret = this.md5(merchantSecret).toUpperCase();
    const rawSig = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`;
    const expectedSig = this.md5(rawSig).toUpperCase();

    if (md5sig !== expectedSig) {
      this.logger.warn(
        `PayHere notify: invalid signature for order ${order_id}`,
      );
      return { success: false };
    }

    // status_code 2 = success
    if (status_code === '2') {
      try {
        const subscription =
          await this.subscriptionRepo.findByOrderId(order_id);
        if (subscription) {
          subscription.payherePaymentId = payment_id;
          subscription.status = 'active';
          await this.subscriptionRepo.save(subscription);
          this.logger.log(
            `Subscription ${subscription.id} activated via PayHere order ${order_id}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to update subscription for order ${order_id}`,
          err,
        );
      }
    }

    return { success: true };
  }
}
