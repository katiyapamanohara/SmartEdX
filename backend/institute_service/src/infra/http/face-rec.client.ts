import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FaceVerifyImageResult {
  verified: boolean;
  distance: number;
  threshold: number;
}

@Injectable()
export class FaceRecClient {
  private readonly logger = new Logger(FaceRecClient.name);
  private readonly gatewayUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.gatewayUrl = this.configService.get<string>(
      'API_GATEWAY_URL',
      'http://localhost:5001',
    );
  }

  async verifyImage(
    descriptorStored: number[],
    imageB64: string,
  ): Promise<FaceVerifyImageResult> {
    const url = `${this.gatewayUrl}/api/ai/face/verify-image`;
    this.logger.log(`Forwarding face verify-image to ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor_stored: descriptorStored, image_b64: imageB64 }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detail = (err as any).detail || `Face server returned ${response.status}`;
      throw new Error(detail);
    }

    return response.json();
  }
}
