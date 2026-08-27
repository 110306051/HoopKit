import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { MuxService, MuxWebhookEvent } from '../../media/mux.service';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  CompleteImageUploadDto,
  CreateImageUploadDto,
  CreateVideoUploadDto,
} from './media.dto';

const IMAGE_BUCKET = 'content-images';
const MEDIA_SELECT =
  'id,title,provider,provider_asset_id,playback_id,kind,status,source_url,thumbnail_url,duration_ms,width,height,original_filename,mime_type,file_size_bytes,error_message,created_at,updated_at';

interface RawMediaAsset {
  id: string;
  title: string;
  provider: 'mux' | 'supabase' | 'external';
  provider_asset_id: string | null;
  playback_id: string | null;
  kind: 'image' | 'video';
  status: 'pending' | 'ready' | 'errored';
  source_url: string | null;
  thumbnail_url: string | null;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class AdminMediaService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly mux: MuxService,
  ) {}

  async listMedia() {
    const { data, error } = await this.supabase.serviceClient
      .from('media_assets')
      .select(MEDIA_SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      throw new InternalServerErrorException(`讀取媒體失敗：${error.message}`);
    }
    return ((data ?? []) as RawMediaAsset[]).map((asset) =>
      this.mapAsset(asset),
    );
  }

  async createImageUpload(input: CreateImageUploadDto, userId: string) {
    const extension = this.imageExtension(input.contentType);
    const path = `${userId}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
    const { data: asset, error: insertError } =
      await this.supabase.serviceClient
        .from('media_assets')
        .insert({
          title: input.title.trim(),
          provider: 'supabase',
          provider_asset_id: path,
          kind: 'image',
          status: 'pending',
          original_filename: input.fileName,
          mime_type: input.contentType,
          file_size_bytes: input.fileSize,
          created_by: userId,
        })
        .select(MEDIA_SELECT)
        .single();
    if (insertError || !asset) {
      throw new InternalServerErrorException(
        `建立圖片資產失敗：${insertError?.message ?? '沒有回傳資料'}`,
      );
    }

    const { data: signedUpload, error: signedError } =
      await this.supabase.serviceClient.storage
        .from(IMAGE_BUCKET)
        .createSignedUploadUrl(path);
    if (signedError || !signedUpload) {
      await this.supabase.serviceClient
        .from('media_assets')
        .delete()
        .eq('id', asset.id);
      throw new InternalServerErrorException(
        `建立圖片上傳權限失敗：${signedError?.message ?? '沒有回傳 token'}`,
      );
    }

    return {
      asset: this.mapAsset(asset),
      bucket: IMAGE_BUCKET,
      path,
      token: signedUpload.token,
    };
  }

  async completeImageUpload(id: string, input: CompleteImageUploadDto) {
    const asset = await this.findRawAsset(id);
    if (
      asset.provider !== 'supabase' ||
      asset.kind !== 'image' ||
      !asset.provider_asset_id
    ) {
      throw new BadRequestException('這筆資產不是 Supabase 圖片上傳。');
    }

    const { data: publicUrl } = this.supabase.serviceClient.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(asset.provider_asset_id);
    const { data, error } = await this.supabase.serviceClient
      .from('media_assets')
      .update({
        status: 'ready',
        source_url: publicUrl.publicUrl,
        thumbnail_url: publicUrl.publicUrl,
        width: input.width ?? null,
        height: input.height ?? null,
        error_message: null,
      })
      .eq('id', id)
      .select(MEDIA_SELECT)
      .single();
    if (error || !data) {
      throw new InternalServerErrorException(
        `完成圖片資產失敗：${error?.message}`,
      );
    }
    return this.mapAsset(data);
  }

  async createVideoUpload(input: CreateVideoUploadDto, userId: string) {
    if (!input.contentType.startsWith('video/')) {
      throw new BadRequestException('請選擇影片檔案。');
    }

    const { data: asset, error: insertError } =
      await this.supabase.serviceClient
        .from('media_assets')
        .insert({
          title: input.title.trim(),
          provider: 'mux',
          kind: 'video',
          status: 'pending',
          original_filename: input.fileName,
          mime_type: input.contentType,
          file_size_bytes: input.fileSize,
          created_by: userId,
        })
        .select(MEDIA_SELECT)
        .single();
    if (insertError || !asset) {
      throw new InternalServerErrorException(
        `建立影片資產失敗：${insertError?.message}`,
      );
    }

    try {
      const upload = await this.mux.createDirectUpload(asset.id as string);
      const { error } = await this.supabase.serviceClient
        .from('media_assets')
        .update({ provider_asset_id: upload.id })
        .eq('id', asset.id);
      if (error) {
        throw new Error(error.message);
      }
      return {
        assetId: asset.id as string,
        uploadId: upload.id,
        uploadUrl: upload.url,
      };
    } catch (error) {
      await this.supabase.serviceClient
        .from('media_assets')
        .update({ status: 'errored', error_message: this.errorMessage(error) })
        .eq('id', asset.id);
      throw error;
    }
  }

  async handleMuxWebhook(event: MuxWebhookEvent) {
    if (event.type === 'video.upload.asset_created' && event.data.asset_id) {
      await this.updateByUploadId(event.data.id, {
        provider_asset_id: event.data.asset_id,
      });
      return;
    }

    if (event.type === 'video.asset.ready') {
      const playbackId = event.data.playback_ids?.find(
        (playback) => playback.policy === 'public',
      )?.id;
      await this.updateMuxAsset(event.data, {
        status: 'ready',
        playback_id: playbackId ?? null,
        thumbnail_url: playbackId
          ? `https://image.mux.com/${playbackId}/thumbnail.webp?time=0`
          : null,
        duration_ms:
          event.data.duration === undefined
            ? null
            : Math.round(event.data.duration * 1000),
        error_message: null,
      });
      return;
    }

    if (event.type === 'video.asset.errored') {
      await this.updateMuxAsset(event.data, {
        status: 'errored',
        error_message:
          event.data.errors?.messages?.join('、') ?? 'Mux 影片處理失敗。',
      });
    }
  }

  private async updateMuxAsset(
    data: MuxWebhookEvent['data'],
    values: Record<string, unknown>,
  ) {
    const query = this.supabase.serviceClient
      .from('media_assets')
      .update(values);
    const { error } = data.passthrough
      ? await query.eq('id', data.passthrough)
      : await query.eq('provider_asset_id', data.id).eq('provider', 'mux');
    if (error) {
      throw new InternalServerErrorException(
        `更新 Mux 資產失敗：${error.message}`,
      );
    }
  }

  private async updateByUploadId(id: string, values: Record<string, unknown>) {
    const { error } = await this.supabase.serviceClient
      .from('media_assets')
      .update(values)
      .eq('provider_asset_id', id)
      .eq('provider', 'mux');
    if (error) {
      throw new InternalServerErrorException(
        `更新 Mux upload 失敗：${error.message}`,
      );
    }
  }

  private async findRawAsset(id: string): Promise<RawMediaAsset> {
    const { data, error } = await this.supabase.serviceClient
      .from('media_assets')
      .select(MEDIA_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new InternalServerErrorException(`讀取媒體失敗：${error.message}`);
    }
    if (!data) {
      throw new NotFoundException('找不到媒體資產。');
    }
    return data;
  }

  private imageExtension(contentType: string) {
    return (
      {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
      } as Record<string, string>
    )[contentType];
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : '未知錯誤';
  }

  private mapAsset(asset: RawMediaAsset) {
    return {
      id: asset.id,
      title: asset.title,
      provider: asset.provider,
      providerAssetId: asset.provider_asset_id,
      playbackId: asset.playback_id,
      kind: asset.kind,
      status: asset.status,
      sourceUrl: asset.source_url,
      thumbnailUrl: asset.thumbnail_url,
      durationMs: asset.duration_ms,
      width: asset.width,
      height: asset.height,
      originalFileName: asset.original_filename,
      mimeType: asset.mime_type,
      fileSizeBytes: asset.file_size_bytes,
      errorMessage: asset.error_message,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at,
    };
  }
}
