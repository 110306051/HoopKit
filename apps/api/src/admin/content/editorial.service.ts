import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SaveMoveDto, SaveWorkoutTemplateDto } from './editorial.dto';

type Status = 'draft' | 'published' | 'archived';

interface RawMove {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  summary: string;
  difficulty: string;
  how_to_use: string;
  when_to_use: string;
  coaching_cues: string[];
  common_mistakes: string[];
  cover_asset_id: string | null;
  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RawWorkout {
  id: string;
  source_player_id: string | null;
  slug: string;
  name: string;
  description: string;
  warmup_notes: string;
  difficulty: string;
  estimated_duration_minutes: number | null;
  cover_asset_id: string | null;
  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RawWorkoutItem {
  id: string;
  section_id: string;
  move_id: string | null;
  title: string;
  instructions: string;
  sets: number | null;
  reps: number | null;
  duration_seconds: number | null;
  rest_seconds: number;
  sort_order: number;
}

interface RawMoveStep {
  id: string;
  title: string;
  description: string;
}

interface RawHighlightClip {
  id: string;
  title: string;
  media_asset_id: string;
  player_id: string | null;
  start_ms: number;
  end_ms: number;
  cover_time_ms: number | null;
}

interface RawWorkoutSection {
  id: string;
  name: string;
  description: string;
}

interface RpcResult<T> {
  data: T | null;
  error: { code?: string; message: string } | null;
}

const MOVE_SELECT =
  'id,category_id,slug,name,summary,difficulty,how_to_use,when_to_use,coaching_cues,common_mistakes,cover_asset_id,status,published_at,created_at,updated_at';
const WORKOUT_SELECT =
  'id,source_player_id,slug,name,description,warmup_notes,difficulty,estimated_duration_minutes,cover_asset_id,status,published_at,created_at,updated_at';

@Injectable()
export class EditorialService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOptions() {
    const client = this.supabase.serviceClient;
    const [categories, tags, players, mediaAssets, moves] = await Promise.all([
      client
        .from('skill_categories')
        .select('id,name,status')
        .order('sort_order'),
      client.from('tags').select('id,name').order('name'),
      client.from('players').select('id,full_name,status').order('full_name'),
      client
        .from('media_assets')
        .select(
          'id,title,kind,provider,status,thumbnail_url,source_url,duration_ms',
        )
        .eq('status', 'ready')
        .order('updated_at', { ascending: false }),
      client.from('moves').select('id,name,status').order('name'),
    ]);
    const failed = [categories, tags, players, mediaAssets, moves].find(
      (result) => result.error,
    );
    if (failed?.error) this.throwReadError(failed.error.message);

    return {
      categories: (categories.data ?? []).map((value) => ({
        id: value.id as string,
        name: value.name as string,
        status: value.status as Status,
      })),
      tags: (tags.data ?? []).map((value) => ({
        id: value.id as string,
        name: value.name as string,
      })),
      players: (players.data ?? []).map((value) => ({
        id: value.id as string,
        name: value.full_name as string,
        status: value.status as Status,
      })),
      mediaAssets: (mediaAssets.data ?? []).map((value) => ({
        id: value.id as string,
        title: value.title as string,
        kind: value.kind as string,
        provider: value.provider as string,
        status: value.status as string,
        thumbnailUrl: value.thumbnail_url as string | null,
        sourceUrl: value.source_url as string | null,
        durationMs: value.duration_ms as number | null,
      })),
      moves: (moves.data ?? []).map((value) => ({
        id: value.id as string,
        name: value.name as string,
        status: value.status as Status,
      })),
    };
  }

  async listMoves() {
    const { data, error } = await this.supabase.serviceClient
      .from('moves')
      .select(MOVE_SELECT)
      .order('updated_at', { ascending: false });
    if (error) this.throwReadError(error.message);
    return ((data ?? []) as unknown as RawMove[]).map((move) =>
      this.mapMoveBase(move),
    );
  }

  async getMove(id: string) {
    const client = this.supabase.serviceClient;
    const [move, players, tags, steps, clips] = await Promise.all([
      client.from('moves').select(MOVE_SELECT).eq('id', id).maybeSingle(),
      client
        .from('move_players')
        .select('player_id')
        .eq('move_id', id)
        .order('sort_order'),
      client.from('move_tags').select('tag_id').eq('move_id', id),
      client
        .from('move_steps')
        .select('id,title,description,sort_order')
        .eq('move_id', id)
        .order('sort_order'),
      client
        .from('highlight_clips')
        .select(
          'id,title,media_asset_id,player_id,start_ms,end_ms,cover_time_ms,sort_order',
        )
        .eq('move_id', id)
        .order('sort_order'),
    ]);
    const failed = [move, players, tags, steps, clips].find(
      (result) => result.error,
    );
    if (failed?.error) this.throwReadError(failed.error.message);
    if (!move.data) throw new NotFoundException('找不到指定的招式。');

    const rawMove = move.data;
    const rawPlayerLinks = (players.data ?? []) as unknown as Array<{
      player_id: string;
    }>;
    const rawTagLinks = (tags.data ?? []) as unknown as Array<{
      tag_id: string;
    }>;
    const rawSteps = (steps.data ?? []) as unknown as RawMoveStep[];
    const rawClips = (clips.data ?? []) as unknown as RawHighlightClip[];

    return {
      ...this.mapMoveBase(rawMove),
      playerIds: rawPlayerLinks.map((value) => value.player_id),
      tagIds: rawTagLinks.map((value) => value.tag_id),
      steps: rawSteps.map((value) => ({
        id: value.id,
        title: value.title,
        description: value.description,
      })),
      clips: rawClips.map((value) => ({
        id: value.id,
        title: value.title,
        mediaAssetId: value.media_asset_id,
        playerId: value.player_id,
        startMs: value.start_ms,
        endMs: value.end_ms,
        coverTimeMs: value.cover_time_ms,
      })),
    };
  }

  async saveMove(id: string | null, input: SaveMoveDto, userId: string) {
    for (const clip of input.clips) {
      if (clip.endMs <= clip.startMs) {
        throw new BadRequestException('影片片段結束時間必須晚於開始時間。');
      }
      if (
        clip.coverTimeMs !== undefined &&
        (clip.coverTimeMs < clip.startMs || clip.coverTimeMs > clip.endMs)
      ) {
        throw new BadRequestException('封面時間必須位於影片片段範圍內。');
      }
    }

    const { data, error } = (await this.supabase.serviceClient.rpc(
      'admin_save_move',
      {
        p_move_id: id,
        p_created_by: userId,
        p_payload: this.normalizeMove(input),
      },
    )) as unknown as RpcResult<string>;
    if (error) this.throwWriteError(error.code, error.message);
    if (!data) throw new InternalServerErrorException('招式儲存未回傳識別碼。');
    return this.getMove(data);
  }

  async listWorkouts() {
    const { data, error } = await this.supabase.serviceClient
      .from('workout_templates')
      .select(WORKOUT_SELECT)
      .order('updated_at', { ascending: false });
    if (error) this.throwReadError(error.message);
    return ((data ?? []) as unknown as RawWorkout[]).map((workout) =>
      this.mapWorkoutBase(workout),
    );
  }

  async getWorkout(id: string) {
    const client = this.supabase.serviceClient;
    const workout = await client
      .from('workout_templates')
      .select(WORKOUT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (workout.error) this.throwReadError(workout.error.message);
    if (!workout.data) throw new NotFoundException('找不到指定的訓練菜單。');

    const sections = await client
      .from('workout_template_sections')
      .select('id,name,description,sort_order')
      .eq('template_id', id)
      .order('sort_order');
    if (sections.error) this.throwReadError(sections.error.message);
    const sectionIds = (sections.data ?? []).map(
      (section) => section.id as string,
    );
    const itemsResult = sectionIds.length
      ? await client
          .from('workout_template_items')
          .select(
            'id,section_id,move_id,title,instructions,sets,reps,duration_seconds,rest_seconds,sort_order',
          )
          .in('section_id', sectionIds)
          .order('sort_order')
      : { data: [], error: null };
    if (itemsResult.error) this.throwReadError(itemsResult.error.message);
    const items = (itemsResult.data ?? []) as unknown as RawWorkoutItem[];
    const rawWorkout = workout.data;
    const rawSections = (sections.data ?? []) as unknown as RawWorkoutSection[];

    return {
      ...this.mapWorkoutBase(rawWorkout),
      sections: rawSections.map((section) => ({
        id: section.id,
        name: section.name,
        description: section.description,
        items: items
          .filter((item) => item.section_id === section.id)
          .map((item) => ({
            id: item.id,
            moveId: item.move_id,
            title: item.title,
            instructions: item.instructions,
            sets: item.sets,
            reps: item.reps,
            durationSeconds: item.duration_seconds,
            restSeconds: item.rest_seconds,
          })),
      })),
    };
  }

  async saveWorkout(
    id: string | null,
    input: SaveWorkoutTemplateDto,
    userId: string,
  ) {
    const { data, error } = (await this.supabase.serviceClient.rpc(
      'admin_save_workout_template',
      {
        p_template_id: id,
        p_created_by: userId,
        p_payload: this.normalizeWorkout(input),
      },
    )) as unknown as RpcResult<string>;
    if (error) this.throwWriteError(error.code, error.message);
    if (!data) throw new InternalServerErrorException('菜單儲存未回傳識別碼。');
    return this.getWorkout(data);
  }

  private normalizeMove(input: SaveMoveDto) {
    return {
      ...input,
      name: input.name.trim(),
      slug: input.slug.trim(),
      summary: input.summary.trim(),
      howToUse: input.howToUse.trim(),
      whenToUse: input.whenToUse.trim(),
      coachingCues: input.coachingCues
        .map((value) => value.trim())
        .filter(Boolean),
      commonMistakes: input.commonMistakes
        .map((value) => value.trim())
        .filter(Boolean),
      playerIds: [...new Set(input.playerIds)],
      tagIds: [...new Set(input.tagIds)],
      coverAssetId: input.coverAssetId || null,
      steps: input.steps.map((step) => ({
        ...step,
        title: step.title.trim(),
        description: step.description.trim(),
      })),
      clips: input.clips.map((clip) => ({
        ...clip,
        title: clip.title.trim(),
        playerId: clip.playerId || null,
        coverTimeMs: clip.coverTimeMs ?? null,
      })),
    };
  }

  private normalizeWorkout(input: SaveWorkoutTemplateDto) {
    return {
      ...input,
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description.trim(),
      warmupNotes: input.warmupNotes.trim(),
      sourcePlayerId: input.sourcePlayerId || null,
      coverAssetId: input.coverAssetId || null,
      estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
      sections: input.sections.map((section) => ({
        ...section,
        name: section.name.trim(),
        description: section.description.trim(),
        items: section.items.map((item) => ({
          ...item,
          moveId: item.moveId || null,
          title: item.title.trim(),
          instructions: item.instructions.trim(),
          sets: item.sets ?? null,
          reps: item.reps ?? null,
          durationSeconds: item.durationSeconds ?? null,
        })),
      })),
    };
  }

  private mapMoveBase(move: RawMove) {
    return {
      id: move.id,
      categoryId: move.category_id,
      slug: move.slug,
      name: move.name,
      summary: move.summary,
      difficulty: move.difficulty,
      howToUse: move.how_to_use,
      whenToUse: move.when_to_use,
      coachingCues: move.coaching_cues,
      commonMistakes: move.common_mistakes,
      coverAssetId: move.cover_asset_id,
      status: move.status,
      publishedAt: move.published_at,
      createdAt: move.created_at,
      updatedAt: move.updated_at,
    };
  }

  private mapWorkoutBase(workout: RawWorkout) {
    return {
      id: workout.id,
      sourcePlayerId: workout.source_player_id,
      slug: workout.slug,
      name: workout.name,
      description: workout.description,
      warmupNotes: workout.warmup_notes,
      difficulty: workout.difficulty,
      estimatedDurationMinutes: workout.estimated_duration_minutes,
      coverAssetId: workout.cover_asset_id,
      status: workout.status,
      publishedAt: workout.published_at,
      createdAt: workout.created_at,
      updatedAt: workout.updated_at,
    };
  }

  private throwReadError(message: string): never {
    throw new InternalServerErrorException(`讀取內容資料失敗：${message}`);
  }

  private throwWriteError(code: string | undefined, message: string): never {
    if (code === '23505') {
      throw new BadRequestException('Slug 或排序位置已被使用。');
    }
    if (code === '23503' || code === '23514' || code === '22P02') {
      throw new BadRequestException(`內容關聯或欄位格式無效：${message}`);
    }
    throw new InternalServerErrorException(`儲存內容失敗：${message}`);
  }
}
