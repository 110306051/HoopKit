import { BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AdminPlayersService } from './admin-players.service';
import { SavePlayerDto } from './player.dto';

const input: SavePlayerDto = {
  fullName: 'Test Player',
  shortName: 'Tester',
  slug: 'test-player',
  bio: 'A player used by the unit test.',
  position: 'guard',
  teamName: 'HoopKit Test',
  nationality: 'TW',
  avatarPath: '',
  status: 'draft',
};

const rawPlayer = {
  id: '10000000-0000-4000-8000-000000000001',
  slug: input.slug,
  full_name: input.fullName,
  short_name: input.shortName,
  bio: input.bio,
  position: input.position,
  team_name: input.teamName,
  nationality: input.nationality,
  avatar_path: null,
  status: input.status,
  published_at: null,
  created_at: '2026-08-04T00:00:00.000Z',
  updated_at: '2026-08-04T00:00:00.000Z',
};

function createQueryBuilder(singleResult: unknown) {
  const builder = {
    insert: jest.fn(),
    select: jest.fn(),
    single: jest.fn().mockResolvedValue(singleResult),
  };
  builder.insert.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  return builder;
}

describe('AdminPlayersService', () => {
  it('creates a player and normalizes an empty avatar path to null', async () => {
    const builder = createQueryBuilder({ data: rawPlayer, error: null });
    const supabase = {
      serviceClient: {
        from: jest.fn().mockReturnValue(builder),
      },
    } as unknown as SupabaseService;
    const service = new AdminPlayersService(supabase);

    const player = await service.createPlayer(
      input,
      '20000000-0000-4000-8000-000000000001',
    );

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Test Player',
        avatar_path: null,
        created_by: '20000000-0000-4000-8000-000000000001',
      }),
    );
    expect(player).toEqual(
      expect.objectContaining({
        id: rawPlayer.id,
        fullName: 'Test Player',
        avatarPath: null,
      }),
    );
  });

  it('returns a user-facing error when a slug is duplicated', async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    });
    const supabase = {
      serviceClient: {
        from: jest.fn().mockReturnValue(builder),
      },
    } as unknown as SupabaseService;
    const service = new AdminPlayersService(supabase);

    await expect(
      service.createPlayer(input, '20000000-0000-4000-8000-000000000001'),
    ).rejects.toThrow(BadRequestException);
  });
});
