import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface MuxUpload {
  id: string;
  url: string;
  status: string;
}

export interface MuxWebhookEvent {
  type: string;
  data: {
    id: string;
    asset_id?: string;
    passthrough?: string;
    duration?: number;
    playback_ids?: Array<{ id: string; policy: string }>;
    errors?: { messages?: string[] };
  };
}

@Injectable()
export class MuxService {
  constructor(private readonly config: ConfigService) {}

  async createDirectUpload(mediaAssetId: string): Promise<MuxUpload> {
    const tokenId = this.requireConfig('MUX_TOKEN_ID');
    const tokenSecret = this.requireConfig('MUX_TOKEN_SECRET');
    const corsOrigin =
      this.config.get<string>('MUX_CORS_ORIGIN') ?? 'http://localhost:3000';

    const response = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cors_origin: corsOrigin,
        timeout: 3600,
        new_asset_settings: {
          passthrough: mediaAssetId,
          playback_policies: ['public'],
          video_quality: 'basic',
        },
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      data?: MuxUpload;
      error?: { messages?: string[] };
    } | null;

    if (!response.ok || !body?.data) {
      const details = body?.error?.messages?.join('、') ?? response.statusText;
      throw new ServiceUnavailableException(`Mux 建立上傳網址失敗：${details}`);
    }

    return body.data;
  }

  verifyWebhook(rawBody: Buffer, signatureHeader?: string): MuxWebhookEvent {
    if (!signatureHeader) {
      throw new UnauthorizedException('缺少 Mux webhook 簽章。');
    }

    const parts = new Map(
      signatureHeader.split(',').map((part) => {
        const [key, value] = part.trim().split('=', 2);
        return [key, value];
      }),
    );
    const timestamp = parts.get('t');
    const signature = parts.get('v1');

    if (!timestamp || !signature) {
      throw new UnauthorizedException('Mux webhook 簽章格式錯誤。');
    }

    const timestampSeconds = Number(timestamp);
    if (
      !Number.isFinite(timestampSeconds) ||
      Math.abs(Date.now() / 1000 - timestampSeconds) > 300
    ) {
      throw new UnauthorizedException('Mux webhook 已過期。');
    }

    const expected = createHmac(
      'sha256',
      this.requireConfig('MUX_WEBHOOK_SECRET'),
    )
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    const receivedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Mux webhook 簽章驗證失敗。');
    }

    return JSON.parse(rawBody.toString('utf8')) as MuxWebhookEvent;
  }

  private requireConfig(name: string): string {
    const value = this.config.get<string>(name);
    if (!value || value.startsWith('replace-with-')) {
      throw new ServiceUnavailableException(
        `${name} 尚未設定，請加入 apps/api/.env。`,
      );
    }
    return value;
  }
}
