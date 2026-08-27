import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const DASHBOARD_TABLES = {
  players: 'players',
  moves: 'moves',
  workoutTemplates: 'workout_templates',
  mediaAssets: 'media_assets',
} as const;

type DashboardMetric = keyof typeof DASHBOARD_TABLES;

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async getDashboardMetrics(): Promise<Record<DashboardMetric, number>> {
    const entries = await Promise.all(
      Object.entries(DASHBOARD_TABLES).map(async ([metric, table]) => {
        const { count, error } = await this.supabase.serviceClient
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          throw new InternalServerErrorException(
            `無法讀取 ${table} 統計資料。`,
          );
        }

        return [metric, count ?? 0] as const;
      }),
    );

    return Object.fromEntries(entries) as Record<DashboardMetric, number>;
  }
}
