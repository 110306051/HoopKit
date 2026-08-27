import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

type ContentStatus = 'draft' | 'published' | 'archived';

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
  updated_at: string;
}

interface RawCategory {
  id: string;
  name: string;
}

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
  status: ContentStatus;
  published_at: string | null;
  updated_at: string;
}

interface RawMovePlayer {
  move_id: string;
  player_id: string;
  relation: string;
  sort_order: number;
}

interface RawTag {
  id: string;
  name: string;
}

interface RawMoveTag {
  move_id: string;
  tag_id: string;
}

interface RawMoveStep {
  id: string;
  move_id: string;
  clip_id: string | null;
  title: string;
  description: string;
  sort_order: number;
}

interface RawHighlightClip {
  id: string;
  move_id: string;
  player_id: string | null;
  media_asset_id: string;
  title: string;
  start_ms: number;
  end_ms: number;
  cover_time_ms: number | null;
  sort_order: number;
}

interface RawMediaAsset {
  id: string;
  title: string;
  provider: string;
  provider_asset_id: string | null;
  playback_id: string | null;
  kind: string;
  status: string;
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

interface RawWorkoutTemplate {
  id: string;
  source_player_id: string | null;
  slug: string;
  name: string;
  description: string;
  warmup_notes: string;
  difficulty: string;
  estimated_duration_minutes: number | null;
  cover_asset_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  updated_at: string;
}

interface RawWorkoutSection {
  id: string;
  template_id: string;
  name: string;
  description: string;
  sort_order: number;
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

@Injectable()
export class AdminContentService {
  constructor(private readonly supabase: SupabaseService) {}

  async getContentLibrary() {
    const client = this.supabase.serviceClient;
    const results = await Promise.all([
      client
        .from('players')
        .select(
          'id,slug,full_name,short_name,bio,position,team_name,nationality,avatar_path,status,published_at,updated_at',
        )
        .order('updated_at', { ascending: false }),
      client.from('skill_categories').select('id,name'),
      client
        .from('moves')
        .select(
          'id,category_id,slug,name,summary,difficulty,how_to_use,when_to_use,coaching_cues,common_mistakes,cover_asset_id,status,published_at,updated_at',
        )
        .order('updated_at', { ascending: false }),
      client
        .from('move_players')
        .select('move_id,player_id,relation,sort_order'),
      client.from('tags').select('id,name'),
      client.from('move_tags').select('move_id,tag_id'),
      client
        .from('move_steps')
        .select('id,move_id,clip_id,title,description,sort_order')
        .order('sort_order'),
      client
        .from('highlight_clips')
        .select(
          'id,move_id,player_id,media_asset_id,title,start_ms,end_ms,cover_time_ms,sort_order',
        )
        .order('sort_order'),
      client
        .from('media_assets')
        .select(
          'id,title,provider,provider_asset_id,playback_id,kind,status,source_url,thumbnail_url,duration_ms,width,height,original_filename,mime_type,file_size_bytes,error_message,created_at,updated_at',
        )
        .order('updated_at', { ascending: false }),
      client
        .from('workout_templates')
        .select(
          'id,source_player_id,slug,name,description,warmup_notes,difficulty,estimated_duration_minutes,cover_asset_id,status,published_at,updated_at',
        )
        .order('updated_at', { ascending: false }),
      client
        .from('workout_template_sections')
        .select('id,template_id,name,description,sort_order')
        .order('sort_order'),
      client
        .from('workout_template_items')
        .select(
          'id,section_id,move_id,title,instructions,sets,reps,duration_seconds,rest_seconds,sort_order',
        )
        .order('sort_order'),
    ]);

    const failedResult = results.find((result) => result.error);
    if (failedResult?.error) {
      throw new InternalServerErrorException(
        `讀取內容資料庫失敗：${failedResult.error.message}`,
      );
    }

    const [
      playersResult,
      categoriesResult,
      movesResult,
      movePlayersResult,
      tagsResult,
      moveTagsResult,
      stepsResult,
      clipsResult,
      mediaResult,
      templatesResult,
      sectionsResult,
      itemsResult,
    ] = results;

    const players = (playersResult.data ?? []) as unknown as RawPlayer[];
    const categories = (categoriesResult.data ??
      []) as unknown as RawCategory[];
    const moves = (movesResult.data ?? []) as unknown as RawMove[];
    const movePlayers = (movePlayersResult.data ??
      []) as unknown as RawMovePlayer[];
    const tags = (tagsResult.data ?? []) as unknown as RawTag[];
    const moveTags = (moveTagsResult.data ?? []) as unknown as RawMoveTag[];
    const steps = (stepsResult.data ?? []) as unknown as RawMoveStep[];
    const clips = (clipsResult.data ?? []) as unknown as RawHighlightClip[];
    const mediaAssets = (mediaResult.data ?? []) as unknown as RawMediaAsset[];
    const templates = (templatesResult.data ??
      []) as unknown as RawWorkoutTemplate[];
    const sections = (sectionsResult.data ??
      []) as unknown as RawWorkoutSection[];
    const items = (itemsResult.data ?? []) as unknown as RawWorkoutItem[];

    const playerById = new Map(players.map((player) => [player.id, player]));
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));
    const mediaById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
    const moveById = new Map(moves.map((move) => [move.id, move]));

    return {
      players: players.map((player) => this.mapPlayer(player)),
      moves: moves.map((move) => ({
        id: move.id,
        slug: move.slug,
        name: move.name,
        summary: move.summary,
        difficulty: move.difficulty,
        howToUse: move.how_to_use,
        whenToUse: move.when_to_use,
        coachingCues: move.coaching_cues,
        commonMistakes: move.common_mistakes,
        status: move.status,
        publishedAt: move.published_at,
        updatedAt: move.updated_at,
        category: categoryById.get(move.category_id)?.name ?? '未分類',
        coverAsset: this.mapMediaAsset(
          move.cover_asset_id ? mediaById.get(move.cover_asset_id) : undefined,
        ),
        players: movePlayers
          .filter((relation) => relation.move_id === move.id)
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((relation) => ({
            ...this.mapPlayer(playerById.get(relation.player_id)),
            relation: relation.relation,
          })),
        tags: moveTags
          .filter((relation) => relation.move_id === move.id)
          .map((relation) => tagById.get(relation.tag_id)?.name)
          .filter((name): name is string => Boolean(name)),
        steps: steps
          .filter((step) => step.move_id === move.id)
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            sortOrder: step.sort_order,
          })),
        clips: clips
          .filter((clip) => clip.move_id === move.id)
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((clip) => ({
            id: clip.id,
            title: clip.title,
            startMs: clip.start_ms,
            endMs: clip.end_ms,
            coverTimeMs: clip.cover_time_ms,
            playerName: clip.player_id
              ? (playerById.get(clip.player_id)?.full_name ?? null)
              : null,
            mediaAsset: this.mapMediaAsset(mediaById.get(clip.media_asset_id)),
          })),
      })),
      workoutTemplates: templates.map((template) => ({
        id: template.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
        warmupNotes: template.warmup_notes,
        difficulty: template.difficulty,
        estimatedDurationMinutes: template.estimated_duration_minutes,
        status: template.status,
        publishedAt: template.published_at,
        updatedAt: template.updated_at,
        sourcePlayerName: template.source_player_id
          ? (playerById.get(template.source_player_id)?.full_name ?? null)
          : null,
        coverAsset: this.mapMediaAsset(
          template.cover_asset_id
            ? mediaById.get(template.cover_asset_id)
            : undefined,
        ),
        sections: sections
          .filter((section) => section.template_id === template.id)
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((section) => ({
            id: section.id,
            name: section.name,
            description: section.description,
            sortOrder: section.sort_order,
            items: items
              .filter((item) => item.section_id === section.id)
              .sort((left, right) => left.sort_order - right.sort_order)
              .map((item) => ({
                id: item.id,
                title: item.title,
                instructions: item.instructions,
                sets: item.sets,
                reps: item.reps,
                durationSeconds: item.duration_seconds,
                restSeconds: item.rest_seconds,
                sortOrder: item.sort_order,
                moveName: item.move_id
                  ? (moveById.get(item.move_id)?.name ?? null)
                  : null,
              })),
          })),
      })),
      mediaAssets: mediaAssets.map((asset) => this.mapMediaAsset(asset)),
    };
  }

  private mapPlayer(player?: RawPlayer) {
    if (!player) {
      return null;
    }

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
      updatedAt: player.updated_at,
    };
  }

  private mapMediaAsset(asset?: RawMediaAsset) {
    if (!asset) {
      return null;
    }

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
