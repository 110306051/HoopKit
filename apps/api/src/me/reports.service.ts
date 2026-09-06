import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { CreateReportDto, ReportTargetType } from './reports.dto';

type ReportTarget = {
  label: string;
  ownerUserId: string | null;
};

@Injectable()
export class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, input: CreateReportDto) {
    const target = await this.requireReportableTarget(
      userId,
      input.targetType,
      input.targetId,
    );
    const { data, error } = await this.supabase.serviceClient
      .from('content_reports')
      .insert({
        reporter_user_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
        target_owner_user_id: target.ownerUserId,
        target_label: target.label,
        reason: input.reason,
        details: input.details?.trim() ?? '',
      })
      .select('id,status,created_at')
      .single();

    if (error?.code === '23505') {
      throw new BadRequestException('你已回報過這筆內容，我們會依序處理。');
    }
    if (error) {
      throw new InternalServerErrorException(
        `建立內容回報失敗：${error.message}`,
      );
    }
    return {
      id: data.id as string,
      status: data.status as string,
      createdAt: data.created_at as string,
    };
  }

  private async requireReportableTarget(
    userId: string,
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<ReportTarget> {
    const client = this.supabase.serviceClient;
    if (targetType === 'user_clip') {
      const { data, error } = await client
        .from('user_clips')
        .select('title,user_id')
        .eq('id', targetId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) this.throwReadError(error.message);
      if (!data) throw new NotFoundException('找不到可回報的個人片段。');
      return {
        label: data.title as string,
        ownerUserId: data.user_id as string,
      };
    }

    const table = targetType === 'move' ? 'moves' : 'workout_templates';
    const { data, error } = await client
      .from(table)
      .select('name')
      .eq('id', targetId)
      .eq('status', 'published')
      .maybeSingle();
    if (error) this.throwReadError(error.message);
    if (!data) throw new NotFoundException('找不到可回報的公開內容。');
    return { label: data.name as string, ownerUserId: null };
  }

  private throwReadError(message: string): never {
    throw new InternalServerErrorException(`驗證回報內容失敗：${message}`);
  }
}
