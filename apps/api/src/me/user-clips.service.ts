import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MuxService, type MuxWebhookEvent } from '../media/mux.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { CreateUserClipUploadDto } from './user-clips.dto';

const CLIP_SELECT =
  'id,user_id,title,description,tags,provider,provider_upload_id,provider_asset_id,playback_id,status,thumbnail_url,duration_ms,original_filename,mime_type,file_size_bytes,error_message,created_at,updated_at';

interface RawUserClip {
  id: string;
  user_id: string;
  title: string;
  description: string;
  tags: string[];
  provider: 'mux';
  provider_upload_id: string | null;
  provider_asset_id: string | null;
  playback_id: string | null;
  status: 'pending' | 'ready' | 'errored';
  thumbnail_url: string | null;
  duration_ms: number | null;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface RawPlayer {
  id: string;
  slug: string;
  full_name: string;
  short_name: string | null;
  avatar_path: string | null;
}

@Injectable()
export class UserClipsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly mux: MuxService,
    private readonly config: ConfigService,
  ) {}

  async list(userId: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('user_clips')
      .select(CLIP_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) this.throwReadError(error.message);
    const clips = (data ?? []) as unknown as RawUserClip[];
    return this.mapClips(clips);
  }

  async options() {
    const { data, error } = await this.supabase.serviceClient
      .from('players')
      .select('id,slug,full_name,short_name,avatar_path')
      .eq('status', 'published')
      .order('full_name');
    if (error) this.throwReadError(error.message);
    return {
      players: ((data ?? []) as unknown as RawPlayer[]).map((player) =>
        this.mapPlayer(player),
      ),
    };
  }

  async createUpload(userId: string, input: CreateUserClipUploadDto) {
    if (!input.contentType.startsWith('video/')) {
      throw new BadRequestException('請選擇影片檔案。');
    }
    const playerIds = [...new Set(input.playerIds)];
    await this.assertPublishedPlayers(playerIds);
    const tags = [
      ...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)),
    ];

    const { data, error } = await this.supabase.serviceClient
      .from('user_clips')
      .insert({
        user_id: userId,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        tags,
        provider: 'mux',
        status: 'pending',
        original_filename: input.fileName,
        mime_type: input.contentType,
        file_size_bytes: input.fileSize,
      })
      .select(CLIP_SELECT)
      .single();
    if (error || !data) {
      throw new InternalServerErrorException(
        `建立個人片段失敗：${error?.message ?? '沒有回傳資料'}`,
      );
    }
    const clip: RawUserClip = data;

    try {
      if (playerIds.length) {
        const { error: linkError } = await this.supabase.serviceClient
          .from('user_clip_players')
          .insert(
            playerIds.map((playerId) => ({
              clip_id: clip.id,
              player_id: playerId,
            })),
          );
        if (linkError) throw new Error(linkError.message);
      }

      const corsOrigin =
        this.config.get<string>('MUX_MOBILE_CORS_ORIGIN') ?? '*';
      const upload = await this.mux.createDirectUpload(
        `user-clip:${clip.id}`,
        corsOrigin,
      );
      const { error: updateError } = await this.supabase.serviceClient
        .from('user_clips')
        .update({ provider_upload_id: upload.id })
        .eq('id', clip.id)
        .eq('user_id', userId);
      if (updateError) throw new Error(updateError.message);

      return { clipId: clip.id, uploadId: upload.id, uploadUrl: upload.url };
    } catch (error) {
      await this.supabase.serviceClient
        .from('user_clips')
        .update({
          status: 'errored',
          error_message:
            error instanceof Error ? error.message : '建立上傳失敗',
        })
        .eq('id', clip.id)
        .eq('user_id', userId);
      throw error;
    }
  }

  async delete(userId: string, clipId: string) {
    const clip = await this.findOwned(userId, clipId);
    if (clip.provider_asset_id) {
      await this.mux.deleteAsset(clip.provider_asset_id);
    } else if (clip.provider_upload_id) {
      await this.mux.cancelUpload(clip.provider_upload_id);
    }
    const { error } = await this.supabase.serviceClient
      .from('user_clips')
      .delete()
      .eq('id', clipId)
      .eq('user_id', userId);
    if (error) {
      throw new InternalServerErrorException(`刪除片段失敗：${error.message}`);
    }
    return { deleted: true };
  }

  async handleMuxWebhook(event: MuxWebhookEvent) {
    const passthrough = event.data.passthrough;
    if (!passthrough?.startsWith('user-clip:')) return;
    const clipId = passthrough.slice('user-clip:'.length);

    if (event.type === 'video.upload.asset_created' && event.data.asset_id) {
      await this.updateFromWebhook(clipId, {
        provider_asset_id: event.data.asset_id,
      });
      return;
    }

    if (event.type === 'video.asset.ready') {
      const playbackId = event.data.playback_ids?.find(
        (playback) => playback.policy === 'public',
      )?.id;
      await this.updateFromWebhook(clipId, {
        provider_asset_id: event.data.id,
        playback_id: playbackId ?? null,
        status: playbackId ? 'ready' : 'errored',
        thumbnail_url: playbackId
          ? `https://image.mux.com/${playbackId}/thumbnail.webp?time=0`
          : null,
        duration_ms:
          event.data.duration === undefined
            ? null
            : Math.round(event.data.duration * 1000),
        error_message: playbackId ? null : 'Mux 未建立公開播放 ID。',
      });
      return;
    }

    if (event.type === 'video.asset.errored') {
      await this.updateFromWebhook(clipId, {
        provider_asset_id: event.data.id,
        status: 'errored',
        error_message:
          event.data.errors?.messages?.join('、') ?? 'Mux 影片處理失敗。',
      });
    }
  }

  private async mapClips(clips: RawUserClip[]) {
    const clipIds = clips.map((clip) => clip.id);
    const { data: links, error } = clipIds.length
      ? await this.supabase.serviceClient
          .from('user_clip_players')
          .select('clip_id,player_id')
          .in('clip_id', clipIds)
      : { data: [], error: null };
    if (error) this.throwReadError(error.message);
    const rawLinks = (links ?? []) as unknown as Array<{
      clip_id: string;
      player_id: string;
    }>;
    const playerIds = [...new Set(rawLinks.map((link) => link.player_id))];
    const { data: players, error: playerError } = playerIds.length
      ? await this.supabase.serviceClient
          .from('players')
          .select('id,slug,full_name,short_name,avatar_path')
          .in('id', playerIds)
      : { data: [], error: null };
    if (playerError) this.throwReadError(playerError.message);
    const playerById = new Map(
      ((players ?? []) as unknown as RawPlayer[]).map((player) => [
        player.id,
        this.mapPlayer(player),
      ]),
    );

    return {
      items: clips.map((clip) => ({
        id: clip.id,
        title: clip.title,
        description: clip.description,
        tags: clip.tags,
        status: clip.status,
        playbackId: clip.playback_id,
        streamUrl: clip.playback_id
          ? `https://stream.mux.com/${clip.playback_id}.m3u8`
          : null,
        thumbnailUrl: clip.thumbnail_url,
        durationMs: clip.duration_ms,
        originalFileName: clip.original_filename,
        fileSizeBytes: clip.file_size_bytes,
        errorMessage: clip.error_message,
        createdAt: clip.created_at,
        players: rawLinks
          .filter((link) => link.clip_id === clip.id)
          .flatMap((link) => {
            const player = playerById.get(link.player_id);
            return player ? [player] : [];
          }),
      })),
    };
  }

  private async assertPublishedPlayers(ids: string[]) {
    if (!ids.length) return;
    const { data, error } = await this.supabase.serviceClient
      .from('players')
      .select('id')
      .eq('status', 'published')
      .in('id', ids);
    if (error) this.throwReadError(error.message);
    if ((data ?? []).length !== ids.length) {
      throw new BadRequestException('包含不存在或尚未發布的球員。');
    }
  }

  private async findOwned(
    userId: string,
    clipId: string,
  ): Promise<RawUserClip> {
    const { data, error } = await this.supabase.serviceClient
      .from('user_clips')
      .select(CLIP_SELECT)
      .eq('id', clipId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) this.throwReadError(error.message);
    if (!data) throw new NotFoundException('找不到個人片段。');
    return data;
  }

  private async updateFromWebhook(
    clipId: string,
    values: Record<string, unknown>,
  ) {
    const { error } = await this.supabase.serviceClient
      .from('user_clips')
      .update(values)
      .eq('id', clipId);
    if (error) {
      throw new InternalServerErrorException(
        `更新個人片段失敗：${error.message}`,
      );
    }
  }

  private mapPlayer(player: RawPlayer) {
    return {
      id: player.id,
      slug: player.slug,
      name: player.full_name,
      shortName: player.short_name,
      avatarUrl: player.avatar_path,
    };
  }

  private throwReadError(message: string): never {
    throw new InternalServerErrorException(`讀取個人片段失敗：${message}`);
  }
}
