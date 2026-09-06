import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { MuxService } from '../../media/mux.service';
import { AdminMediaService } from './admin-media.service';
import { UserClipsService } from '../../me/user-clips.service';

@Controller('webhooks/mux')
export class MuxWebhookController {
  constructor(
    private readonly mux: MuxService,
    private readonly mediaService: AdminMediaService,
    private readonly userClips: UserClipsService,
  ) {}

  @Post()
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('mux-signature') signature?: string,
  ) {
    if (!request.rawBody) {
      throw new Error('NestJS rawBody 未啟用。');
    }
    const event = this.mux.verifyWebhook(request.rawBody, signature);
    await Promise.all([
      this.mediaService.handleMuxWebhook(event),
      this.userClips.handleMuxWebhook(event),
    ]);
    return { received: true };
  }
}
