import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateUserClipUploadDto } from './user-clips.dto';
import { UserClipsService } from './user-clips.service';

@Controller('me/clips')
@UseGuards(AuthGuard)
export class UserClipsController {
  constructor(private readonly clips: UserClipsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.clips.list(user.id);
  }

  @Get('options')
  options() {
    return this.clips.options();
  }

  @Post('upload-url')
  createUpload(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateUserClipUploadDto,
  ) {
    return this.clips.createUpload(user.id, body);
  }

  @Delete(':clipId')
  delete(
    @CurrentUser() user: AuthUser,
    @Param('clipId', ParseUUIDPipe) clipId: string,
  ) {
    return this.clips.delete(user.id, clipId);
  }
}
