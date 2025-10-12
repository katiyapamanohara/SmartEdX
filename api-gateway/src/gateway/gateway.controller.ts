import {
  All,
  Controller,
  Req,
  Res,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service';

@Controller('quiz')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  // Catch-all for /quiz/** and forward to downstream service
  @All('*')
  async proxy(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const { status, data, headers } = await this.gatewayService.forward(req);

      // Forward selected headers
      Object.entries(headers || {}).forEach(([k, v]) => {
        const key = k.toLowerCase();
        if (['transfer-encoding', 'content-length', 'connection'].includes(key)) {
          return;
        }
        if (typeof v === 'string') res.setHeader(k, v);
      });

      res.status(status);
      return data;
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      const status = e?.response?.status || 502;
      const message =
        e?.response?.data?.message || e?.message || 'Bad Gateway';
      throw new HttpException({ message }, status);
    }
  }
}
