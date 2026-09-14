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
  asset_id?: string | null;
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

  async createDirectUpload(
    mediaAssetId: string,
    requestedCorsOrigin?: string,
  ): Promise<MuxUpload> {
    const tokenId = this.requireConfig('MUX_TOKEN_ID');
    const tokenSecret = this.requireConfig('MUX_TOKEN_SECRET');
    const corsOrigin =
      requestedCorsOrigin ??
      this.config.get<string>('MUX_CORS_ORIGIN') ??
      'http://localhost:3000';

    let response: Response;
    try {
      response = await fetch('https://api.mux.com/video/v1/uploads', {
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
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知網路錯誤';
      throw new ServiceUnavailableException(
        `無法連線到 Mux API，請確認後端網路與防火牆設定：${reason}`,
      );
    }

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

  async deleteAsset(assetId: string) {
    return this.deleteMuxResource(`/video/v1/assets/${assetId}`);
  }

  async getUpload(uploadId: string): Promise<MuxUpload | null> {
    const tokenId = this.requireConfig('MUX_TOKEN_ID');
    const tokenSecret = this.requireConfig('MUX_TOKEN_SECRET');
    let response: Response;
    try {
      response = await fetch(
        `https://api.mux.com/video/v1/uploads/${uploadId}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`,
          },
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知網路錯誤';
      throw new ServiceUnavailableException(`無法查詢 Mux upload：${reason}`);
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Mux 查詢 upload 失敗：${response.statusText}`,
      );
    }
    const body = (await response.json()) as { data?: MuxUpload };
    if (!body.data) {
      throw new ServiceUnavailableException('Mux 查詢 upload 沒有回傳資料。');
    }
    return body.data;
  }

  async cancelUpload(uploadId: string) {
    const tokenId = this.requireConfig('MUX_TOKEN_ID');
    const tokenSecret = this.requireConfig('MUX_TOKEN_SECRET');
    let response: Response;
    try {
      response = await fetch(
        `https://api.mux.com/video/v1/uploads/${uploadId}/cancel`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`,
          },
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知網路錯誤';
      throw new ServiceUnavailableException(
        `無法連線到 Mux API，請確認後端網路與防火牆設定：${reason}`,
      );
    }
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(
        `Mux 取消上傳失敗：${response.statusText}`,
      );
    }
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

  private async deleteMuxResource(path: string) {
    const tokenId = this.requireConfig('MUX_TOKEN_ID');
    const tokenSecret = this.requireConfig('MUX_TOKEN_SECRET');
    const response = await fetch(`https://api.mux.com${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`,
      },
    });
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(
        `Mux 刪除影片失敗：${response.statusText}`,
      );
    }
    return response.status !== 404;
  }
}
