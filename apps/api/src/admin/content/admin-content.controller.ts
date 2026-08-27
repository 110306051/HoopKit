import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminContentService } from './admin-content.service';

@Controller('admin/content')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class AdminContentController {
  constructor(private readonly contentService: AdminContentService) {}

  @Get()
  getContentLibrary() {
    return this.contentService.getContentLibrary();
  }
}
