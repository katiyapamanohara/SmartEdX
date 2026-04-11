import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PayhereService } from './payhere.service';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('PayHere')
@Controller('payhere')
export class PayhereController {
  constructor(private readonly payhereService: PayhereService) {}

  @Post('hash')
  @ApiOperation({ summary: 'Generate PayHere payment hash' })
  generateHash(
    @Body()
    body: {
      orderId: string;
      amount: string;
      currency: string;
    },
  ) {
    const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
    const hash = this.payhereService.generateHash(
      merchantId,
      body.orderId,
      body.amount,
      body.currency,
    );
    return { hash, merchant_id: merchantId };
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Build PayHere checkout params' })
  buildCheckout(@Body() body: any) {
    return this.payhereService.buildCheckoutParams(body);
  }

  @Public()
  @Post('notify')
  @ApiOperation({ summary: 'PayHere payment notification webhook (public)' })
  async handleNotify(@Body() body: Record<string, string>) {
    return this.payhereService.handleNotify(body);
  }
}
