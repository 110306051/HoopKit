import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  CreatePlanDto,
  CreatePlanItemDto,
  SaveSectionDto,
  UpdatePlanDto,
  UpdatePlanItemDto,
  UpdateProfileDto,
} from './me.dto';

export interface PersonalPlan {
  id: string;
  name: string;
  description: string;
  source_template_id: string | null;
  updated_at: string;
}

interface RawTemplate {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface RawTemplateSection {
  id: string;
  name: string;
  sort_order: number;
}

interface RawTemplateItem {
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

interface RawInsertedSection {
  id: string;
  name: string;
  sort_order: number;
}

interface RawPersonalSection {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
}

interface RawPersonalItem {
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
export class MeService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOverview(user: AuthUser) {
    const client = this.supabase.serviceClient;
    const [profile, favoriteMoves, favoriteWorkouts, plans] = await Promise.all(
      [
        client
          .from('profiles')
          .select('id,display_name,avatar_path,skill_level,dominant_hand')
          .eq('id', user.id)
          .maybeSingle(),
        client
          .from('favorite_moves')
          .select('move_id,created_at,moves(id,slug,name,summary)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        client
          .from('favorite_workout_templates')
          .select(
            'template_id,created_at,workout_templates(id,slug,name,description)',
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        client
          .from('user_workout_plans')
          .select('id,name,description,source_template_id,updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ],
    );
    const failed = [profile, favoriteMoves, favoriteWorkouts, plans].find(
      (result) => result.error,
    );
    if (failed?.error) this.throwDatabaseError(failed.error.message);

    return {
      account: { id: user.id, email: user.email },
      profile: profile.data
        ? {
            displayName: profile.data.display_name as string,
            avatarPath: profile.data.avatar_path as string | null,
            skillLevel: profile.data.skill_level as string | null,
            dominantHand: profile.data.dominant_hand as string | null,
          }
        : null,
      favoriteMoves: (
        (favoriteMoves.data ?? []) as unknown as Array<{ moves: unknown }>
      ).map((row) => row.moves),
      favoriteWorkouts: (
        (favoriteWorkouts.data ?? []) as unknown as Array<{
          workout_templates: unknown;
        }>
      ).map((row) => row.workout_templates),
      plans: ((plans.data ?? []) as unknown as PersonalPlan[]).map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        sourceTemplateId: plan.source_template_id,
        updatedAt: plan.updated_at,
      })),
    };
  }

  async updateProfile(userId: string, body: UpdateProfileDto) {
    const { data, error } = await this.supabase.serviceClient
      .from('profiles')
      .update({ display_name: body.displayName.trim() })
      .eq('id', userId)
      .select('display_name,avatar_path,skill_level,dominant_hand')
      .single();
    if (error) this.throwDatabaseError(error.message);
    return data;
  }

  favoriteMove(userId: string, moveId: string) {
    return this.upsertFavorite('favorite_moves', 'move_id', userId, moveId);
  }

  unfavoriteMove(userId: string, moveId: string) {
    return this.deleteFavorite('favorite_moves', 'move_id', userId, moveId);
  }

  favoriteWorkout(userId: string, templateId: string) {
    return this.upsertFavorite(
      'favorite_workout_templates',
      'template_id',
      userId,
      templateId,
    );
  }

  unfavoriteWorkout(userId: string, templateId: string) {
    return this.deleteFavorite(
      'favorite_workout_templates',
      'template_id',
      userId,
      templateId,
    );
  }

  async createPlan(userId: string, body: CreatePlanDto) {
    const { data, error } = await this.supabase.serviceClient
      .from('user_workout_plans')
      .insert({
        user_id: userId,
        name: body.name.trim(),
        description: body.description?.trim() ?? '',
      })
      .select('id,name,description,source_template_id,updated_at')
      .single();
    if (error) this.throwDatabaseError(error.message);
    return data;
  }

  async getPlan(userId: string, planId: string) {
    const plan = await this.requireOwnedPlan(userId, planId);
    const client = this.supabase.serviceClient;
    const sectionsResult = await client
      .from('user_workout_plan_sections')
      .select('id,plan_id,name,sort_order')
      .eq('plan_id', planId)
      .order('sort_order');
    if (sectionsResult.error)
      this.throwDatabaseError(sectionsResult.error.message);
    const sections = (sectionsResult.data ??
      []) as unknown as RawPersonalSection[];
    const sectionIds = sections.map((section) => section.id);
    const itemsResult = sectionIds.length
      ? await client
          .from('user_workout_plan_items')
          .select(
            'id,section_id,move_id,title,instructions,sets,reps,duration_seconds,rest_seconds,sort_order',
          )
          .in('section_id', sectionIds)
          .order('sort_order')
      : { data: [], error: null };
    if (itemsResult.error) this.throwDatabaseError(itemsResult.error.message);
    const items = (itemsResult.data ?? []) as unknown as RawPersonalItem[];
    const moveIds = [
      ...new Set(
        items
          .map((item) => item.move_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const movesResult = moveIds.length
      ? await client.from('moves').select('id,slug,name').in('id', moveIds)
      : { data: [], error: null };
    if (movesResult.error) this.throwDatabaseError(movesResult.error.message);
    const movesById = new Map(
      (movesResult.data ?? []).map((move) => [
        move.id as string,
        {
          id: move.id as string,
          slug: move.slug as string,
          name: move.name as string,
        },
      ]),
    );

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      sourceTemplateId: plan.source_template_id,
      updatedAt: plan.updated_at,
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name,
        sortOrder: section.sort_order,
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
            sortOrder: item.sort_order,
            move: item.move_id ? (movesById.get(item.move_id) ?? null) : null,
          })),
      })),
    };
  }

  async updatePlan(userId: string, planId: string, body: UpdatePlanDto) {
    await this.requireOwnedPlan(userId, planId);
    if (body.name === undefined && body.description === undefined) {
      throw new BadRequestException('至少提供一個要更新的欄位。');
    }
    const updates: Record<string, string> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined)
      updates.description = body.description.trim();
    const { data, error } = await this.supabase.serviceClient
      .from('user_workout_plans')
      .update(updates)
      .eq('id', planId)
      .eq('user_id', userId)
      .select('id,name,description,source_template_id,updated_at')
      .single();
    if (error) this.throwDatabaseError(error.message);
    return data;
  }

  async deletePlan(userId: string, planId: string) {
    await this.requireOwnedPlan(userId, planId);
    const { error } = await this.supabase.serviceClient
      .from('user_workout_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);
    if (error) this.throwDatabaseError(error.message);
    return { deleted: true };
  }

  async createSection(userId: string, planId: string, body: SaveSectionDto) {
    await this.requireOwnedPlan(userId, planId);
    const client = this.supabase.serviceClient;
    const lastResult = await client
      .from('user_workout_plan_sections')
      .select('sort_order')
      .eq('plan_id', planId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastResult.error) this.throwDatabaseError(lastResult.error.message);
    const nextOrder =
      ((lastResult.data?.sort_order as number | undefined) ?? -1) + 1;
    const { data, error } = await client
      .from('user_workout_plan_sections')
      .insert({
        plan_id: planId,
        name: body.name.trim(),
        sort_order: nextOrder,
      })
      .select('id,name,sort_order')
      .single();
    if (error) this.throwDatabaseError(error.message);
    await this.touchPlan(userId, planId);
    return data;
  }

  async updateSection(
    userId: string,
    planId: string,
    sectionId: string,
    body: SaveSectionDto,
  ) {
    await this.requireOwnedSection(userId, planId, sectionId);
    const { data, error } = await this.supabase.serviceClient
      .from('user_workout_plan_sections')
      .update({ name: body.name.trim() })
      .eq('id', sectionId)
      .eq('plan_id', planId)
      .select('id,name,sort_order')
      .single();
    if (error) this.throwDatabaseError(error.message);
    await this.touchPlan(userId, planId);
    return data;
  }

  async deleteSection(userId: string, planId: string, sectionId: string) {
    await this.requireOwnedSection(userId, planId, sectionId);
    const { error } = await this.supabase.serviceClient
      .from('user_workout_plan_sections')
      .delete()
      .eq('id', sectionId)
      .eq('plan_id', planId);
    if (error) this.throwDatabaseError(error.message);
    await this.touchPlan(userId, planId);
    return { deleted: true };
  }

  async reorderSections(userId: string, planId: string, ids: string[]) {
    const { error } = await this.supabase.serviceClient.rpc(
      'reorder_user_workout_plan_sections',
      { p_user_id: userId, p_plan_id: planId, p_section_ids: ids },
    );
    if (error) this.throwDatabaseError(error.message);
    return { reordered: true };
  }

  async createItem(
    userId: string,
    planId: string,
    sectionId: string,
    body: CreatePlanItemDto,
  ) {
    await this.requireOwnedSection(userId, planId, sectionId);
    this.assertWorkVolume(body.reps, body.durationSeconds);
    const client = this.supabase.serviceClient;
    if (body.moveId) {
      const moveResult = await client
        .from('moves')
        .select('id')
        .eq('id', body.moveId)
        .eq('status', 'published')
        .maybeSingle();
      if (moveResult.error) this.throwDatabaseError(moveResult.error.message);
      if (!moveResult.data)
        throw new NotFoundException('找不到可加入的已發布招式。');
    }
    const lastResult = await client
      .from('user_workout_plan_items')
      .select('sort_order')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastResult.error) this.throwDatabaseError(lastResult.error.message);
    const nextOrder =
      ((lastResult.data?.sort_order as number | undefined) ?? -1) + 1;
    const { data, error } = await client
      .from('user_workout_plan_items')
      .insert({
        section_id: sectionId,
        move_id: body.moveId ?? null,
        title: body.title.trim(),
        instructions: body.instructions?.trim() ?? '',
        sets: body.sets ?? null,
        reps: body.reps ?? null,
        duration_seconds: body.durationSeconds ?? null,
        rest_seconds: body.restSeconds ?? 0,
        sort_order: nextOrder,
      })
      .select(
        'id,section_id,move_id,title,instructions,sets,reps,duration_seconds,rest_seconds,sort_order',
      )
      .single();
    if (error) this.throwDatabaseError(error.message);
    await this.touchPlan(userId, planId);
    return data;
  }

  async updateItem(
    userId: string,
    planId: string,
    itemId: string,
    body: UpdatePlanItemDto,
  ) {
    const current = await this.requireOwnedItem(userId, planId, itemId);
    const reps = body.reps ?? (body.durationSeconds ? null : current.reps);
    const durationSeconds =
      body.durationSeconds ?? (body.reps ? null : current.duration_seconds);
    this.assertWorkVolume(reps, durationSeconds);
    const updates: Record<string, string | number | null> = {
      reps,
      duration_seconds: durationSeconds,
    };
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.instructions !== undefined)
      updates.instructions = body.instructions.trim();
    if (body.sets !== undefined) updates.sets = body.sets;
    if (body.restSeconds !== undefined) updates.rest_seconds = body.restSeconds;
    const { data, error } = await this.supabase.serviceClient
      .from('user_workout_plan_items')
      .update(updates)
      .eq('id', itemId)
      .select(
        'id,section_id,move_id,title,instructions,sets,reps,duration_seconds,rest_seconds,sort_order',
      )
      .single();
    if (error) this.throwDatabaseError(error.message);
    await this.touchPlan(userId, planId);
    return data;
  }

  async deleteItem(userId: string, planId: string, itemId: string) {
    await this.requireOwnedItem(userId, planId, itemId);
    const { error } = await this.supabase.serviceClient
      .from('user_workout_plan_items')
      .delete()
      .eq('id', itemId);
    if (error) this.throwDatabaseError(error.message);
    await this.touchPlan(userId, planId);
    return { deleted: true };
  }

  async reorderItems(
    userId: string,
    planId: string,
    sectionId: string,
    ids: string[],
  ) {
    const { error } = await this.supabase.serviceClient.rpc(
      'reorder_user_workout_plan_items',
      {
        p_user_id: userId,
        p_plan_id: planId,
        p_section_id: sectionId,
        p_item_ids: ids,
      },
    );
    if (error) this.throwDatabaseError(error.message);
    return { reordered: true };
  }

  async cloneTemplate(userId: string, templateId: string, customName?: string) {
    const client = this.supabase.serviceClient;
    const templateResult = await client
      .from('workout_templates')
      .select('id,name,description,status')
      .eq('id', templateId)
      .eq('status', 'published')
      .maybeSingle();
    if (templateResult.error)
      this.throwDatabaseError(templateResult.error.message);
    if (!templateResult.data)
      throw new NotFoundException('找不到已發布的訓練菜單。');

    const sectionsResult = await client
      .from('workout_template_sections')
      .select('id,name,sort_order')
      .eq('template_id', templateId)
      .order('sort_order');
    if (sectionsResult.error)
      this.throwDatabaseError(sectionsResult.error.message);
    const template: RawTemplate = templateResult.data;
    const templateSections = (sectionsResult.data ??
      []) as unknown as RawTemplateSection[];
    const sectionIds = templateSections.map((section) => section.id);
    const itemsResult = sectionIds.length
      ? await client
          .from('workout_template_items')
          .select(
            'id,section_id,move_id,title,instructions,sets,reps,duration_seconds,rest_seconds,sort_order',
          )
          .in('section_id', sectionIds)
          .order('sort_order')
      : { data: [], error: null };
    if (itemsResult.error) this.throwDatabaseError(itemsResult.error.message);
    const templateItems = (itemsResult.data ??
      []) as unknown as RawTemplateItem[];

    const planResult = await client
      .from('user_workout_plans')
      .insert({
        user_id: userId,
        source_template_id: templateId,
        name: customName?.trim() || `${template.name}（我的版本）`,
        description: template.description,
      })
      .select('id,name,description,source_template_id,updated_at')
      .single();
    if (planResult.error) this.throwDatabaseError(planResult.error.message);
    const plan: PersonalPlan = planResult.data;

    try {
      const sectionRows = templateSections.map((section) => ({
        plan_id: plan.id,
        name: section.name,
        sort_order: section.sort_order,
      }));
      const insertedSections = sectionRows.length
        ? await client
            .from('user_workout_plan_sections')
            .insert(sectionRows)
            .select('id,name,sort_order')
        : { data: [], error: null };
      if (insertedSections.error) throw insertedSections.error;
      const personalSections = (insertedSections.data ??
        []) as unknown as RawInsertedSection[];
      const sectionByOrder = new Map(
        personalSections.map((section) => [section.sort_order, section.id]),
      );
      const templateOrderById = new Map(
        templateSections.map((section) => [section.id, section.sort_order]),
      );
      const itemRows = templateItems.map((item) => {
        const templateOrder = templateOrderById.get(item.section_id);
        const personalSectionId =
          templateOrder === undefined
            ? undefined
            : sectionByOrder.get(templateOrder);
        if (!personalSectionId) {
          throw new Error('無法對應個人菜單區段。');
        }
        return {
          section_id: personalSectionId,
          move_id: item.move_id,
          source_template_item_id: item.id,
          title: item.title,
          instructions: item.instructions,
          sets: item.sets,
          reps: item.reps,
          duration_seconds: item.duration_seconds,
          rest_seconds: item.rest_seconds,
          sort_order: item.sort_order,
        };
      });
      if (itemRows.length) {
        const insertedItems = await client
          .from('user_workout_plan_items')
          .insert(itemRows);
        if (insertedItems.error) throw insertedItems.error;
      }
      return plan;
    } catch (error) {
      await client.from('user_workout_plans').delete().eq('id', plan.id);
      this.throwDatabaseError(
        error instanceof Error ? error.message : '複製菜單失敗。',
      );
    }
  }

  private async requireOwnedPlan(
    userId: string,
    planId: string,
  ): Promise<PersonalPlan> {
    const { data, error } = await this.supabase.serviceClient
      .from('user_workout_plans')
      .select('id,name,description,source_template_id,updated_at')
      .eq('id', planId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) this.throwDatabaseError(error.message);
    if (!data) throw new NotFoundException('找不到這份個人訓練菜單。');
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string,
      source_template_id: data.source_template_id as string | null,
      updated_at: data.updated_at as string,
    };
  }

  private async requireOwnedSection(
    userId: string,
    planId: string,
    sectionId: string,
  ): Promise<RawPersonalSection> {
    await this.requireOwnedPlan(userId, planId);
    const { data, error } = await this.supabase.serviceClient
      .from('user_workout_plan_sections')
      .select('id,plan_id,name,sort_order')
      .eq('id', sectionId)
      .eq('plan_id', planId)
      .maybeSingle();
    if (error) this.throwDatabaseError(error.message);
    if (!data) throw new NotFoundException('找不到這個訓練區段。');
    return {
      id: data.id as string,
      plan_id: data.plan_id as string,
      name: data.name as string,
      sort_order: data.sort_order as number,
    };
  }

  private async requireOwnedItem(
    userId: string,
    planId: string,
    itemId: string,
  ) {
    await this.requireOwnedPlan(userId, planId);
    const { data, error } = await this.supabase.serviceClient
      .from('user_workout_plan_items')
      .select(
        'id,section_id,move_id,title,instructions,sets,reps,duration_seconds,rest_seconds,sort_order,user_workout_plan_sections!inner(plan_id)',
      )
      .eq('id', itemId)
      .eq('user_workout_plan_sections.plan_id', planId)
      .maybeSingle();
    if (error) this.throwDatabaseError(error.message);
    if (!data) throw new NotFoundException('找不到這個訓練項目。');
    return data as unknown as RawPersonalItem;
  }

  private assertWorkVolume(
    reps: number | null | undefined,
    durationSeconds: number | null | undefined,
  ) {
    if (!reps && !durationSeconds) {
      throw new BadRequestException('訓練項目必須設定次數或持續時間。');
    }
  }

  private async touchPlan(userId: string, planId: string) {
    const { error } = await this.supabase.serviceClient
      .from('user_workout_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('user_id', userId);
    if (error) this.throwDatabaseError(error.message);
  }

  private async upsertFavorite(
    table: 'favorite_moves' | 'favorite_workout_templates',
    idColumn: 'move_id' | 'template_id',
    userId: string,
    targetId: string,
  ) {
    const { error } = await this.supabase.serviceClient
      .from(table)
      .upsert({ user_id: userId, [idColumn]: targetId });
    if (error) this.throwDatabaseError(error.message);
    return { favorited: true };
  }

  private async deleteFavorite(
    table: 'favorite_moves' | 'favorite_workout_templates',
    idColumn: 'move_id' | 'template_id',
    userId: string,
    targetId: string,
  ) {
    const { error } = await this.supabase.serviceClient
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq(idColumn, targetId);
    if (error) this.throwDatabaseError(error.message);
    return { favorited: false };
  }

  private throwDatabaseError(message: string): never {
    throw new InternalServerErrorException(`會員資料操作失敗：${message}`);
  }
}
