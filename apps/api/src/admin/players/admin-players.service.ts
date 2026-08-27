import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ContentStatus, SavePlayerDto } from './player.dto';

interface RawPlayer {
  id: string;
  slug: string;
  full_name: string;
  short_name: string | null;
  bio: string;
  position: string;
  team_name: string | null;
  nationality: string | null;
  avatar_path: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const PLAYER_SELECT =
  'id,slug,full_name,short_name,bio,position,team_name,nationality,avatar_path,status,published_at,created_at,updated_at';

@Injectable()
export class AdminPlayersService {
  constructor(private readonly supabase: SupabaseService) {}

  async listPlayers() {
    const { data, error } = await this.supabase.serviceClient
      .from('players')
      .select(PLAYER_SELECT)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(`讀取球員失敗：${error.message}`);
    }

    return ((data ?? []) as unknown as RawPlayer[]).map((player) =>
      this.mapPlayer(player),
    );
  }

  async getPlayer(id: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('players')
      .select(PLAYER_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(`讀取球員失敗：${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('找不到指定球員。');
    }

    return this.mapPlayer(data);
  }

  async createPlayer(input: SavePlayerDto, createdBy: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('players')
      .insert({
        ...this.toDatabaseInput(input),
        created_by: createdBy,
      })
      .select(PLAYER_SELECT)
      .single();

    if (error) {
      this.throwWriteError(error.code, error.message);
    }

    return this.mapPlayer(data);
  }

  async updatePlayer(id: string, input: SavePlayerDto) {
    const currentPlayer = await this.getPlayer(id);
    const publishedAt =
      input.status === 'published'
        ? (currentPlayer.publishedAt ?? new Date().toISOString())
        : null;

    const { data, error } = await this.supabase.serviceClient
      .from('players')
      .update({
        ...this.toDatabaseInput(input),
        published_at: publishedAt,
      })
      .eq('id', id)
      .select(PLAYER_SELECT)
      .maybeSingle();

    if (error) {
      this.throwWriteError(error.code, error.message);
    }

    if (!data) {
      throw new NotFoundException('找不到指定球員。');
    }

    return this.mapPlayer(data);
  }

  private toDatabaseInput(input: SavePlayerDto) {
    return {
      full_name: input.fullName.trim(),
      short_name: this.nullIfEmpty(input.shortName),
      slug: input.slug.trim(),
      bio: input.bio.trim(),
      position: input.position,
      team_name: this.nullIfEmpty(input.teamName),
      nationality: this.nullIfEmpty(input.nationality),
      avatar_path: this.nullIfEmpty(input.avatarPath),
      status: input.status,
      published_at:
        input.status === 'published' ? new Date().toISOString() : null,
    };
  }

  private nullIfEmpty(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private throwWriteError(code: string | undefined, message: string): never {
    if (code === '23505') {
      throw new BadRequestException('Slug 已被其他球員使用。');
    }

    throw new InternalServerErrorException(`儲存球員失敗：${message}`);
  }

  private mapPlayer(player: RawPlayer) {
    return {
      id: player.id,
      slug: player.slug,
      fullName: player.full_name,
      shortName: player.short_name,
      bio: player.bio,
      position: player.position,
      teamName: player.team_name,
      nationality: player.nationality,
      avatarPath: player.avatar_path,
      status: player.status,
      publishedAt: player.published_at,
      createdAt: player.created_at,
      updatedAt: player.updated_at,
    };
  }
}
