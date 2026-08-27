import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ContentListQueryDto } from './content-query.dto';

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
  published_at: string;
}

interface RawPlayer {
  id: string;
  slug: string;
  full_name: string;
  short_name: string | null;
  avatar_path: string | null;
}

interface RawMedia {
  id: string;
  title: string;
  playback_id: string | null;
  kind: string;
  source_url: string | null;
  thumbnail_url: string | null;
  duration_ms: number | null;
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
  published_at: string;
}

interface MoveContext {
  categoryById: Map<string, { id: string; slug: string; name: string }>;
  mediaById: Map<string, RawMedia>;
  playersByMove: Map<string, RawPlayer[]>;
}

const MOVE_SELECT =
  'id,category_id,slug,name,summary,difficulty,how_to_use,when_to_use,coaching_cues,common_mistakes,cover_asset_id,published_at';
const WORKOUT_SELECT =
  'id,source_player_id,slug,name,description,warmup_notes,difficulty,estimated_duration_minutes,cover_asset_id,published_at';
const MEDIA_SELECT =
  'id,title,playback_id,kind,source_url,thumbnail_url,duration_ms';

@Injectable()
export class ContentService {
  constructor(private readonly supabase: SupabaseService) {}

  async listMoves(query: ContentListQueryDto) {
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    let request = this.supabase.serviceClient
      .from('moves')
      .select(MOVE_SELECT, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(from, to);
    if (query.query?.trim()) {
      request = request.ilike('name', `%${query.query.trim()}%`);
    }
    if (query.difficulty) request = request.eq('difficulty', query.difficulty);

    const { data, error, count } = await request;
    if (error) this.throwReadError(error.message);
    const moves = (data ?? []) as unknown as RawMove[];
    const context = await this.loadMoveContext(moves);
    return {
      items: moves.map((move) => this.mapMoveSummary(move, context)),
      page: query.page,
      limit: query.limit,
      total: count ?? 0,
    };
  }

  async getMove(slug: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('moves')
      .select(MOVE_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) this.throwReadError(error.message);
    if (!data) throw new NotFoundException('找不到已發布的招式。');
    const move = this.asMove(data);
    const context = await this.loadMoveContext([move]);
    const client = this.supabase.serviceClient;
    const [stepsResult, tagsResult, clipsResult] = await Promise.all([
      client
        .from('move_steps')
        .select('id,title,description,sort_order')
        .eq('move_id', move.id)
        .order('sort_order'),
      client.from('move_tags').select('tag_id').eq('move_id', move.id),
      client
        .from('highlight_clips')
        .select(
          'id,title,player_id,media_asset_id,start_ms,end_ms,cover_time_ms,sort_order',
        )
        .eq('move_id', move.id)
        .order('sort_order'),
    ]);
    const failed = [stepsResult, tagsResult, clipsResult].find(
      (result) => result.error,
    );
    if (failed?.error) this.throwReadError(failed.error.message);

    const tagIds = (tagsResult.data ?? []).map(
      (value) => value.tag_id as string,
    );
    const clips = (clipsResult.data ?? []) as unknown as Array<{
      id: string;
      title: string;
      player_id: string | null;
      media_asset_id: string;
      start_ms: number;
      end_ms: number;
      cover_time_ms: number | null;
    }>;
    const clipMedia = await this.loadReadyMedia(
      clips.map((clip) => clip.media_asset_id),
    );
    const clipPlayers = await this.loadPlayers(
      clips
        .map((clip) => clip.player_id)
        .filter((id): id is string => Boolean(id)),
    );
    const tags = tagIds.length
      ? await client.from('tags').select('id,slug,name').in('id', tagIds)
      : { data: [], error: null };
    if (tags.error) this.throwReadError(tags.error.message);

    return {
      ...this.mapMoveSummary(move, context),
      howToUse: move.how_to_use,
      whenToUse: move.when_to_use,
      coachingCues: move.coaching_cues,
      commonMistakes: move.common_mistakes,
      tags: (tags.data ?? []).map((tag) => ({
        id: tag.id as string,
        slug: tag.slug as string,
        name: tag.name as string,
      })),
      steps: (stepsResult.data ?? []).map((step) => ({
        id: step.id as string,
        title: step.title as string,
        description: step.description as string,
      })),
      clips: clips.flatMap((clip) => {
        const media = clipMedia.get(clip.media_asset_id);
        if (!media?.playback_id) return [];
        return [
          {
            id: clip.id,
            title: clip.title,
            startSeconds: clip.start_ms / 1000,
            endSeconds: clip.end_ms / 1000,
            coverTimeSeconds:
              clip.cover_time_ms === null ? null : clip.cover_time_ms / 1000,
            player: clip.player_id
              ? this.mapPlayer(clipPlayers.get(clip.player_id))
              : null,
            playbackId: media.playback_id,
            streamUrl: `https://stream.mux.com/${media.playback_id}.m3u8`,
            thumbnailUrl: `https://image.mux.com/${media.playback_id}/thumbnail.webp?time=${(clip.cover_time_ms ?? clip.start_ms) / 1000}`,
          },
        ];
      }),
    };
  }

  async listWorkoutTemplates(query: ContentListQueryDto) {
    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    let request = this.supabase.serviceClient
      .from('workout_templates')
      .select(WORKOUT_SELECT, { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(from, to);
    if (query.query?.trim()) {
      request = request.ilike('name', `%${query.query.trim()}%`);
    }
    if (query.difficulty) request = request.eq('difficulty', query.difficulty);
    const { data, error, count } = await request;
    if (error) this.throwReadError(error.message);
    const workouts = (data ?? []) as unknown as RawWorkout[];
    const [players, media] = await Promise.all([
      this.loadPlayers(
        workouts
          .map((workout) => workout.source_player_id)
          .filter((id): id is string => Boolean(id)),
      ),
      this.loadReadyMedia(
        workouts
          .map((workout) => workout.cover_asset_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ]);
    return {
      items: workouts.map((workout) =>
        this.mapWorkoutSummary(workout, players, media),
      ),
      page: query.page,
      limit: query.limit,
      total: count ?? 0,
    };
  }

  async getWorkoutTemplate(slug: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('workout_templates')
      .select(WORKOUT_SELECT)
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) this.throwReadError(error.message);
    if (!data) throw new NotFoundException('找不到已發布的訓練菜單。');
    const workout = this.asWorkout(data);
    const client = this.supabase.serviceClient;
    const sectionsResult = await client
      .from('workout_template_sections')
      .select('id,name,description,sort_order')
      .eq('template_id', workout.id)
      .order('sort_order');
    if (sectionsResult.error) this.throwReadError(sectionsResult.error.message);
    const sections = (sectionsResult.data ?? []) as unknown as Array<{
      id: string;
      name: string;
      description: string;
    }>;
    const sectionIds = sections.map((section) => section.id);
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
    const items = (itemsResult.data ?? []) as unknown as Array<{
      id: string;
      section_id: string;
      move_id: string | null;
      title: string;
      instructions: string;
      sets: number | null;
      reps: number | null;
      duration_seconds: number | null;
      rest_seconds: number;
    }>;
    const moveIds = items
      .map((item) => item.move_id)
      .filter((id): id is string => Boolean(id));
    const movesResult = moveIds.length
      ? await client
          .from('moves')
          .select('id,slug,name')
          .eq('status', 'published')
          .in('id', moveIds)
      : { data: [], error: null };
    if (movesResult.error) this.throwReadError(movesResult.error.message);
    const moveById = new Map(
      (movesResult.data ?? []).map((move) => [
        move.id as string,
        { slug: move.slug as string, name: move.name as string },
      ]),
    );
    const [players, media] = await Promise.all([
      this.loadPlayers(
        workout.source_player_id ? [workout.source_player_id] : [],
      ),
      this.loadReadyMedia(
        workout.cover_asset_id ? [workout.cover_asset_id] : [],
      ),
    ]);

    return {
      ...this.mapWorkoutSummary(workout, players, media),
      warmupNotes: workout.warmup_notes,
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name,
        description: section.description,
        items: items
          .filter((item) => item.section_id === section.id)
          .map((item) => ({
            id: item.id,
            title: item.title,
            instructions: item.instructions,
            sets: item.sets,
            reps: item.reps,
            durationSeconds: item.duration_seconds,
            restSeconds: item.rest_seconds,
            move: item.move_id ? (moveById.get(item.move_id) ?? null) : null,
          })),
      })),
    };
  }

  private async loadMoveContext(moves: RawMove[]): Promise<MoveContext> {
    const categoryIds = [...new Set(moves.map((move) => move.category_id))];
    const coverIds = moves
      .map((move) => move.cover_asset_id)
      .filter((id): id is string => Boolean(id));
    const moveIds = moves.map((move) => move.id);
    const client = this.supabase.serviceClient;
    const [categories, mediaById, links] = await Promise.all([
      categoryIds.length
        ? client
            .from('skill_categories')
            .select('id,slug,name')
            .eq('status', 'published')
            .in('id', categoryIds)
        : Promise.resolve({ data: [], error: null }),
      this.loadReadyMedia(coverIds),
      moveIds.length
        ? client
            .from('move_players')
            .select('move_id,player_id,sort_order')
            .in('move_id', moveIds)
            .order('sort_order')
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (categories.error) this.throwReadError(categories.error.message);
    if (links.error) this.throwReadError(links.error.message);
    const rawLinks = (links.data ?? []) as unknown as Array<{
      move_id: string;
      player_id: string;
    }>;
    const players = await this.loadPlayers(
      rawLinks.map((link) => link.player_id),
    );
    const playersByMove = new Map<string, RawPlayer[]>();
    for (const link of rawLinks) {
      const player = players.get(link.player_id);
      if (player) {
        playersByMove.set(link.move_id, [
          ...(playersByMove.get(link.move_id) ?? []),
          player,
        ]);
      }
    }
    return {
      categoryById: new Map(
        (categories.data ?? []).map((category) => [
          category.id as string,
          {
            id: category.id as string,
            slug: category.slug as string,
            name: category.name as string,
          },
        ]),
      ),
      mediaById,
      playersByMove,
    };
  }

  private async loadReadyMedia(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return new Map<string, RawMedia>();
    const { data, error } = await this.supabase.serviceClient
      .from('media_assets')
      .select(MEDIA_SELECT)
      .eq('status', 'ready')
      .in('id', uniqueIds);
    if (error) this.throwReadError(error.message);
    const media = (data ?? []) as unknown as RawMedia[];
    return new Map(media.map((asset) => [asset.id, asset]));
  }

  private async loadPlayers(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return new Map<string, RawPlayer>();
    const { data, error } = await this.supabase.serviceClient
      .from('players')
      .select('id,slug,full_name,short_name,avatar_path')
      .eq('status', 'published')
      .in('id', uniqueIds);
    if (error) this.throwReadError(error.message);
    const players = (data ?? []) as unknown as RawPlayer[];
    return new Map(players.map((player) => [player.id, player]));
  }

  private mapMoveSummary(move: RawMove, context: MoveContext) {
    return {
      id: move.id,
      slug: move.slug,
      name: move.name,
      summary: move.summary,
      difficulty: move.difficulty,
      publishedAt: move.published_at,
      category: context.categoryById.get(move.category_id) ?? null,
      cover: move.cover_asset_id
        ? this.mapMedia(context.mediaById.get(move.cover_asset_id))
        : null,
      players: (context.playersByMove.get(move.id) ?? []).map((player) =>
        this.mapPlayer(player),
      ),
    };
  }

  private asMove(value: unknown): RawMove {
    return value as RawMove;
  }

  private asWorkout(value: unknown): RawWorkout {
    return value as RawWorkout;
  }

  private mapWorkoutSummary(
    workout: RawWorkout,
    players: Map<string, RawPlayer>,
    media: Map<string, RawMedia>,
  ) {
    return {
      id: workout.id,
      slug: workout.slug,
      name: workout.name,
      description: workout.description,
      difficulty: workout.difficulty,
      estimatedDurationMinutes: workout.estimated_duration_minutes,
      publishedAt: workout.published_at,
      sourcePlayer: workout.source_player_id
        ? this.mapPlayer(players.get(workout.source_player_id))
        : null,
      cover: workout.cover_asset_id
        ? this.mapMedia(media.get(workout.cover_asset_id))
        : null,
    };
  }

  private mapPlayer(player?: RawPlayer) {
    if (!player) return null;
    return {
      id: player.id,
      slug: player.slug,
      name: player.full_name,
      shortName: player.short_name,
      avatarUrl: player.avatar_path,
    };
  }

  private mapMedia(media?: RawMedia) {
    if (!media) return null;
    return {
      id: media.id,
      title: media.title,
      kind: media.kind,
      sourceUrl: media.source_url,
      thumbnailUrl: media.thumbnail_url,
      durationMs: media.duration_ms,
    };
  }

  private throwReadError(message: string): never {
    throw new InternalServerErrorException(`讀取公開內容失敗：${message}`);
  }
}
