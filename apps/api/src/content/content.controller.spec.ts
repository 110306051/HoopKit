import { Test } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

describe('ContentController', () => {
  const contentService = {
    listMoves: jest.fn(),
    getMove: jest.fn(),
    listWorkoutTemplates: jest.fn(),
    getWorkoutTemplate: jest.fn(),
  };

  let controller: ContentController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [{ provide: ContentService, useValue: contentService }],
    }).compile();
    controller = module.get(ContentController);
  });

  it('delegates the public move list query', async () => {
    const query = { page: 1, limit: 20 };
    contentService.listMoves.mockResolvedValue({ items: [], total: 0 });
    await expect(controller.listMoves(query)).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(contentService.listMoves).toHaveBeenCalledWith(query);
  });

  it('loads a workout template by public slug', async () => {
    contentService.getWorkoutTemplate.mockResolvedValue({ slug: 'guard-plan' });
    await expect(controller.getWorkoutTemplate('guard-plan')).resolves.toEqual({
      slug: 'guard-plan',
    });
  });
});
