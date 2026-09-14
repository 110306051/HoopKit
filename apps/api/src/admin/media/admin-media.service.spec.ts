import { BadRequestException } from '@nestjs/common';
import { MuxService } from '../../media/mux.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AdminMediaService } from './admin-media.service';

const assetId = '10000000-0000-4000-8000-000000000001';

function createHarness(
  asset: Record<string, unknown>,
  referencedTable?: string,
) {
  const mediaRead = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: asset, error: null }),
  };
  const deleteRow = jest.fn().mockReturnThis();
  const mediaDelete = {
    delete: deleteRow,
    eq: jest.fn().mockResolvedValue({ error: null }),
  };
  const storageRemove = jest.fn().mockResolvedValue({ error: null });
  let mediaCalls = 0;
  const from = jest.fn((table: string) => {
    if (table === 'media_assets') {
      mediaCalls += 1;
      return mediaCalls === 1 ? mediaRead : mediaDelete;
    }
    const result = {
      data: table === referencedTable ? [{ id: 'reference-1' }] : [],
      error: null,
    };
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(result),
    };
  });
  const supabase = {
    serviceClient: {
      from,
      storage: { from: jest.fn().mockReturnValue({ remove: storageRemove }) },
    },
  } as unknown as SupabaseService;
  const muxGetUpload = jest.fn();
  const muxDeleteAsset = jest.fn().mockResolvedValue(true);
  const muxCancelUpload = jest.fn();
  const mux = {
    getUpload: muxGetUpload,
    cancelUpload: muxCancelUpload,
    deleteAsset: muxDeleteAsset,
  } as unknown as MuxService;
  return {
    service: new AdminMediaService(supabase, mux),
    mux,
    deleteRow,
    muxGetUpload,
    muxDeleteAsset,
    muxCancelUpload,
    storageRemove,
  };
}

describe('AdminMediaService.deleteMedia', () => {
  it('resolves a pending Mux upload to its asset and deletes both asset and DB row', async () => {
    const harness = createHarness({
      id: assetId,
      provider: 'mux',
      provider_asset_id: 'upload-1',
      source_url: null,
    });
    harness.muxGetUpload.mockResolvedValue({
      id: 'upload-1',
      status: 'asset_created',
      asset_id: 'mux-asset-1',
      url: '',
    });

    await expect(harness.service.deleteMedia(assetId)).resolves.toEqual({
      deleted: true,
      muxAssetNotFound: false,
    });
    expect(harness.muxDeleteAsset).toHaveBeenCalledWith('mux-asset-1');
    expect(harness.deleteRow).toHaveBeenCalled();
  });

  it('cancels an upload that is still waiting instead of deleting an asset ID', async () => {
    const harness = createHarness({
      id: assetId,
      provider: 'mux',
      provider_asset_id: 'upload-2',
      source_url: null,
    });
    harness.muxGetUpload.mockResolvedValue({
      id: 'upload-2',
      status: 'waiting',
    });

    await harness.service.deleteMedia(assetId);
    expect(harness.muxCancelUpload).toHaveBeenCalledWith('upload-2');
    expect(harness.muxDeleteAsset).not.toHaveBeenCalled();
    expect(harness.deleteRow).toHaveBeenCalled();
  });

  it('keeps the DB row when Mux deletion fails', async () => {
    const harness = createHarness({
      id: assetId,
      provider: 'mux',
      provider_asset_id: 'mux-asset-3',
      source_url: null,
    });
    harness.muxGetUpload.mockResolvedValue(null);
    harness.muxDeleteAsset.mockRejectedValue(new Error('Mux unavailable'));

    await expect(harness.service.deleteMedia(assetId)).rejects.toThrow(
      'Mux unavailable',
    );
    expect(harness.deleteRow).not.toHaveBeenCalled();
  });

  it('reports when the current Mux environment cannot find the asset', async () => {
    const harness = createHarness({
      id: assetId,
      provider: 'mux',
      provider_asset_id: 'old-asset',
      source_url: null,
    });
    harness.muxGetUpload.mockResolvedValue(null);
    harness.muxDeleteAsset.mockResolvedValue(false);

    await expect(harness.service.deleteMedia(assetId)).resolves.toEqual({
      deleted: true,
      muxAssetNotFound: true,
    });
    expect(harness.deleteRow).toHaveBeenCalled();
  });

  it('refuses to delete a referenced image before touching storage or DB', async () => {
    const harness = createHarness(
      {
        id: assetId,
        provider: 'supabase',
        provider_asset_id: 'admin/avatar.png',
        source_url: 'https://example.com/avatar.png',
      },
      'players',
    );

    await expect(harness.service.deleteMedia(assetId)).rejects.toThrow(
      BadRequestException,
    );
    expect(harness.storageRemove).not.toHaveBeenCalled();
    expect(harness.deleteRow).not.toHaveBeenCalled();
  });

  it('removes an unreferenced image from storage before deleting the DB row', async () => {
    const harness = createHarness({
      id: assetId,
      provider: 'supabase',
      provider_asset_id: 'admin/image.png',
      source_url: 'https://example.com/image.png',
    });

    await harness.service.deleteMedia(assetId);
    expect(harness.storageRemove).toHaveBeenCalledWith(['admin/image.png']);
    expect(harness.deleteRow).toHaveBeenCalled();
  });
});
