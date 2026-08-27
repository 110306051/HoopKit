import { InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MeService } from './me.service';

describe('MeService', () => {
  const userId = '10000000-0000-4000-8000-000000000001';
  const planId = '20000000-0000-4000-8000-000000000001';
  const sectionId = '30000000-0000-4000-8000-000000000001';
  const ids = [
    '40000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
  ];

  function createService(rpcResult: { error: { message: string } | null }) {
    const rpc = jest.fn().mockResolvedValue(rpcResult);
    const supabase = {
      serviceClient: { rpc },
    } as unknown as SupabaseService;

    return { service: new MeService(supabase), rpc };
  }

  it('reorders only the requested user plan sections', async () => {
    const { service, rpc } = createService({ error: null });

    await expect(service.reorderSections(userId, planId, ids)).resolves.toEqual(
      { reordered: true },
    );
    expect(rpc).toHaveBeenCalledWith('reorder_user_workout_plan_sections', {
      p_user_id: userId,
      p_plan_id: planId,
      p_section_ids: ids,
    });
  });

  it('includes the parent section when reordering items', async () => {
    const { service, rpc } = createService({ error: null });

    await expect(
      service.reorderItems(userId, planId, sectionId, ids),
    ).resolves.toEqual({ reordered: true });
    expect(rpc).toHaveBeenCalledWith('reorder_user_workout_plan_items', {
      p_user_id: userId,
      p_plan_id: planId,
      p_section_id: sectionId,
      p_item_ids: ids,
    });
  });

  it('converts a database reorder failure into a server error', async () => {
    const { service } = createService({
      error: {
        message: 'Section order must include every section exactly once',
      },
    });

    await expect(service.reorderSections(userId, planId, ids)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
