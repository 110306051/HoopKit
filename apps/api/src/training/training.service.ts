import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';
type ItemStatus = 'pending' | 'completed' | 'skipped';
type SessionAction = 'pause' | 'resume' | 'abandon';
type ItemAction = 'complete_set' | 'skip';

interface RawSession {
  id: string;
  source_plan_id: string | null;
  plan_name_snapshot: string;
  plan_description_snapshot: string;
  status: SessionStatus;
  started_at: string;
  paused_at: string | null;
  accumulated_pause_seconds: number;
  completed_at: string | null;
  elapsed_seconds: number | null;
  current_item_index: number;
  total_items: number;
  completed_items: number;
}

interface RawSection {
  id: string;
  name_snapshot: string;
  sort_order: number;
}

interface RawItem {
  id: string;
  section_id: string;
  source_move_id: string | null;
  move_slug_snapshot: string | null;
  title_snapshot: string;
  instructions_snapshot: string;
  sets_snapshot: number | null;
  reps_snapshot: number | null;
  duration_seconds_snapshot: number | null;
  rest_seconds_snapshot: number;
  global_sort_order: number;
  completed_sets: number;
  status: ItemStatus;
  completed_at: string | null;
}

@Injectable()
export class TrainingService {
  constructor(private readonly supabase: SupabaseService) {}

  async start(userId: string, planId: string) {
    const { data, error } = (await this.supabase.serviceClient.rpc(
      'start_user_workout_session',
      { p_user_id: userId, p_plan_id: planId },
    )) as unknown as {
      data: unknown;
      error: { message: string } | null;
    };
    if (error) this.throwStartError(error.message);
    if (typeof data !== 'string')
      this.throwDatabaseError('start function did not return a session id');
    return this.getSession(userId, data);
  }

  async list(userId: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('workout_sessions')
      .select(
        'id,source_plan_id,plan_name_snapshot,plan_description_snapshot,status,started_at,paused_at,accumulated_pause_seconds,completed_at,elapsed_seconds,current_item_index,total_items,completed_items',
      )
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(30);
    if (error) this.throwDatabaseError(error.message);
    return { items: ((data ?? []) as unknown as RawSession[]).map(mapSummary) };
  }

  async getActive(userId: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .maybeSingle();
    if (error) this.throwDatabaseError(error.message);
    if (!data) return null;
    return this.getSession(userId, data.id as string);
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const client = this.supabase.serviceClient;
    const [sectionsResult, itemsResult] = await Promise.all([
      client
        .from('workout_session_sections')
        .select('id,name_snapshot,sort_order')
        .eq('session_id', sessionId)
        .order('sort_order'),
      client
        .from('workout_session_items')
        .select(
          'id,section_id,source_move_id,move_slug_snapshot,title_snapshot,instructions_snapshot,sets_snapshot,reps_snapshot,duration_seconds_snapshot,rest_seconds_snapshot,global_sort_order,completed_sets,status,completed_at',
        )
        .eq('session_id', sessionId)
        .order('global_sort_order'),
    ]);
    if (sectionsResult.error)
      this.throwDatabaseError(sectionsResult.error.message);
    if (itemsResult.error) this.throwDatabaseError(itemsResult.error.message);
    const sections = (sectionsResult.data ?? []) as unknown as RawSection[];
    const items = (itemsResult.data ?? []) as unknown as RawItem[];

    return {
      ...mapSummary(session),
      serverNow: new Date().toISOString(),
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name_snapshot,
        sortOrder: section.sort_order,
        items: items
          .filter((item) => item.section_id === section.id)
          .map(mapItem),
      })),
    };
  }

  async changeState(userId: string, sessionId: string, action: SessionAction) {
    const { error } = await this.supabase.serviceClient.rpc(
      'set_user_workout_session_state',
      {
        p_user_id: userId,
        p_session_id: sessionId,
        p_action: action,
      },
    );
    if (error) this.throwOperationError(error.message);
    return this.getSession(userId, sessionId);
  }

  async progressItem(
    userId: string,
    sessionId: string,
    itemId: string,
    action: ItemAction,
  ) {
    const { error } = await this.supabase.serviceClient.rpc(
      'progress_user_workout_session_item',
      {
        p_user_id: userId,
        p_session_id: sessionId,
        p_item_id: itemId,
        p_action: action,
      },
    );
    if (error) this.throwOperationError(error.message);
    return this.getSession(userId, sessionId);
  }

  private async requireOwnedSession(
    userId: string,
    sessionId: string,
  ): Promise<RawSession> {
    const { data, error } = await this.supabase.serviceClient
      .from('workout_sessions')
      .select(
        'id,source_plan_id,plan_name_snapshot,plan_description_snapshot,status,started_at,paused_at,accumulated_pause_seconds,completed_at,elapsed_seconds,current_item_index,total_items,completed_items',
      )
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) this.throwDatabaseError(error.message);
    if (!data) throw new NotFoundException('找不到這筆訓練紀錄。');
    return {
      id: data.id as string,
      source_plan_id: data.source_plan_id as string | null,
      plan_name_snapshot: data.plan_name_snapshot as string,
      plan_description_snapshot: data.plan_description_snapshot as string,
      status: data.status as SessionStatus,
      started_at: data.started_at as string,
      paused_at: data.paused_at as string | null,
      accumulated_pause_seconds: data.accumulated_pause_seconds as number,
      completed_at: data.completed_at as string | null,
      elapsed_seconds: data.elapsed_seconds as number | null,
      current_item_index: data.current_item_index as number,
      total_items: data.total_items as number,
      completed_items: data.completed_items as number,
    };
  }

  private throwStartError(message: string): never {
    if (message.includes('already exists')) {
      throw new ConflictException('已有進行中的訓練，請先繼續或結束它。');
    }
    if (message.includes('has no items')) {
      throw new BadRequestException('菜單內至少需要一個訓練項目。');
    }
    if (message.includes('not found')) {
      throw new NotFoundException('找不到這份個人訓練菜單。');
    }
    this.throwDatabaseError(message);
  }

  private throwOperationError(message: string): never {
    if (
      message.includes('not active') ||
      message.includes('only an') ||
      message.includes('pending workout')
    ) {
      throw new ConflictException('訓練狀態已改變，請重新整理後再操作。');
    }
    if (message.includes('not found')) {
      throw new NotFoundException('找不到這筆訓練資料。');
    }
    this.throwDatabaseError(message);
  }

  private throwDatabaseError(message: string): never {
    throw new InternalServerErrorException(`訓練資料操作失敗：${message}`);
  }
}

function mapSummary(session: RawSession) {
  return {
    id: session.id,
    sourcePlanId: session.source_plan_id,
    planName: session.plan_name_snapshot,
    planDescription: session.plan_description_snapshot,
    status: session.status,
    startedAt: session.started_at,
    pausedAt: session.paused_at,
    accumulatedPauseSeconds: session.accumulated_pause_seconds,
    completedAt: session.completed_at,
    elapsedSeconds: session.elapsed_seconds,
    currentItemIndex: session.current_item_index,
    totalItems: session.total_items,
    completedItems: session.completed_items,
  };
}

function mapItem(item: RawItem) {
  return {
    id: item.id,
    moveId: item.source_move_id,
    moveSlug: item.move_slug_snapshot,
    title: item.title_snapshot,
    instructions: item.instructions_snapshot,
    sets: item.sets_snapshot,
    reps: item.reps_snapshot,
    durationSeconds: item.duration_seconds_snapshot,
    restSeconds: item.rest_seconds_snapshot,
    globalSortOrder: item.global_sort_order,
    completedSets: item.completed_sets,
    status: item.status,
    completedAt: item.completed_at,
  };
}
