import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MuxService } from '../media/mux.service';
import { SupabaseService } from '../supabase/supabase.service';

type OwnedClipResource = {
  provider_asset_id: string | null;
  provider_upload_id: string | null;
};

@Injectable()
export class AccountService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly mux: MuxService,
  ) {}

  /**
   * Removes externally stored user videos before deleting the Auth identity.
   * Database-owned personal records are removed by their auth.users cascades.
   */
  async deleteAccount(userId: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('user_clips')
      .select('provider_asset_id,provider_upload_id')
      .eq('user_id', userId);
    if (error) {
      throw new InternalServerErrorException(
        `讀取待刪除的個人影片失敗：${error.message}`,
      );
    }

    for (const clip of (data ?? []) as unknown as OwnedClipResource[]) {
      if (clip.provider_asset_id) {
        await this.mux.deleteAsset(clip.provider_asset_id);
      } else if (clip.provider_upload_id) {
        await this.mux.cancelUpload(clip.provider_upload_id);
      }
    }

    const { error: deleteError } =
      await this.supabase.serviceClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw new InternalServerErrorException(
        `刪除登入帳號失敗：${deleteError.message}`,
      );
    }
    return { deleted: true };
  }
}
