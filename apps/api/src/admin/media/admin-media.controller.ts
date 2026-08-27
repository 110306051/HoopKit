import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import type { AuthUser } from '../../auth/auth-user';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminMediaService } from './admin-media.service';
import {
  CompleteImageUploadDto,
  CreateImageUploadDto,
  CreateVideoUploadDto,
} from './media.dto';

@Controller('admin/media')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class AdminMediaController {
  constructor(private readonly mediaService: AdminMediaService) {}

  @Get()
  listMedia() {
    return this.mediaService.listMedia();
  }

  @Post('images/upload-url')
  createImageUpload(
    @Body() input: CreateImageUploadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mediaService.createImageUpload(input, user.id);
  }

  @Post('images/:id/complete')
  completeImageUpload(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: CompleteImageUploadDto,
  ) {
    return this.mediaService.completeImageUpload(id, input);
  }

  @Post('videos/upload-url')
  createVideoUpload(
    @Body() input: CreateVideoUploadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.mediaService.createVideoUpload(input, user.id);
  }
}
