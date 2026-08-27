import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContentListQueryDto } from './content-query.dto';
import { ContentService } from './content.service';

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('moves')
  listMoves(@Query() query: ContentListQueryDto) {
    return this.contentService.listMoves(query);
  }

  @Get('moves/:slug')
  getMove(@Param('slug') slug: string) {
    return this.contentService.getMove(slug);
  }

  @Get('workout-templates')
  listWorkoutTemplates(@Query() query: ContentListQueryDto) {
    return this.contentService.listWorkoutTemplates(query);
  }

  @Get('workout-templates/:slug')
  getWorkoutTemplate(@Param('slug') slug: string) {
    return this.contentService.getWorkoutTemplate(slug);
  }
}
