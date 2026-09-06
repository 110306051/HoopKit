import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { ReviewReportDto } from './admin-reports.dto';

type RawReport = {
  id: string;
  reporter_user_id: string | null;
  target_type: string;
  target_id: string;
  target_owner_user_id: string | null;
  target_label: string;
  reason: string;
  details: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string;
  created_at: string;
  updated_at: string;
};

const REPORT_SELECT =
  'id,reporter_user_id,target_type,target_id,target_owner_user_id,target_label,reason,details,status,reviewed_by,reviewed_at,resolution_notes,created_at,updated_at';

@Injectable()
export class AdminReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list() {
    const { data, error } = await this.supabase.serviceClient
      .from('content_reports')
      .select(REPORT_SELECT)
      .order('created_at', { ascending: false });
    if (error) this.throwDatabaseError(`讀取內容回報失敗：${error.message}`);
    return ((data ?? []) as unknown as RawReport[]).map((report) =>
      this.mapReport(report),
    );
  }

  async review(id: string, reviewerId: string, input: ReviewReportDto) {
    const { data, error } = await this.supabase.serviceClient
      .from('content_reports')
      .update({
        status: input.status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        resolution_notes: input.resolutionNotes?.trim() ?? '',
      })
      .eq('id', id)
      .select(REPORT_SELECT)
      .maybeSingle();
    if (error) this.throwDatabaseError(`更新內容回報失敗：${error.message}`);
    if (!data) throw new NotFoundException('找不到指定的內容回報。');
    return this.mapReport(data);
  }

  private mapReport(report: RawReport) {
    return {
      id: report.id,
      reporterUserId: report.reporter_user_id,
      targetType: report.target_type,
      targetId: report.target_id,
      targetOwnerUserId: report.target_owner_user_id,
      targetLabel: report.target_label,
      reason: report.reason,
      details: report.details,
      status: report.status,
      reviewedBy: report.reviewed_by,
      reviewedAt: report.reviewed_at,
      resolutionNotes: report.resolution_notes,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };
  }

  private throwDatabaseError(message: string): never {
    throw new InternalServerErrorException(message);
  }
}
