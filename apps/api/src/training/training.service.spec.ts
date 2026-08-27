import { ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TrainingService } from './training.service';

describe('TrainingService', () => {
  const userId = '10000000-0000-4000-8000-000000000001';
  const planId = '20000000-0000-4000-8000-000000000001';
  const sessionId = '30000000-0000-4000-8000-000000000001';
  const itemId = '40000000-0000-4000-8000-000000000001';
  const detail = {
    id: sessionId,
    sourcePlanId: planId,
    planName: 'Test plan',
    planDescription: '',
    status: 'active' as const,
    startedAt: '2026-08-11T00:00:00.000Z',
    pausedAt: null,
    accumulatedPauseSeconds: 0,
    completedAt: null,
    elapsedSeconds: null,
    currentItemIndex: 0,
    totalItems: 1,
    completedItems: 0,
    serverNow: '2026-08-11T00:00:00.000Z',
    sections: [],
  };

  function createService(result: { data: unknown; error: unknown }) {
    const rpc = jest.fn().mockResolvedValue(result);
    const supabase = {
      serviceClient: { rpc },
    } as unknown as SupabaseService;
    const service = new TrainingService(supabase);
    jest.spyOn(service, 'getSession').mockResolvedValue(detail);
    return { service, rpc };
  }

  it('starts a session through the atomic snapshot function', async () => {
    const { service, rpc } = createService({ data: sessionId, error: null });

    await expect(service.start(userId, planId)).resolves.toEqual(detail);
    expect(rpc).toHaveBeenCalledWith('start_user_workout_session', {
      p_user_id: userId,
      p_plan_id: planId,
    });
  });

  it('sends item progress with the authenticated user and session', async () => {
    const { service, rpc } = createService({ data: sessionId, error: null });

    await service.progressItem(userId, sessionId, itemId, 'complete_set');

    expect(rpc).toHaveBeenCalledWith('progress_user_workout_session_item', {
      p_user_id: userId,
      p_session_id: sessionId,
      p_item_id: itemId,
      p_action: 'complete_set',
    });
  });

  it('rejects starting another open workout session', async () => {
    const { service } = createService({
      data: null,
      error: { message: 'an active workout session already exists' },
    });

    await expect(service.start(userId, planId)).rejects.toThrow(
      ConflictException,
    );
  });
});
