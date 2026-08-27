import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { StartWorkoutSessionDto } from './training.dto';
import { TrainingService } from './training.service';

@Controller('me/workout-sessions')
@UseGuards(AuthGuard)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  start(@CurrentUser() user: AuthUser, @Body() body: StartWorkoutSessionDto) {
    return this.trainingService.start(user.id, body.planId);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.trainingService.list(user.id);
  }

  @Get('active')
  active(@CurrentUser() user: AuthUser) {
    return this.trainingService.getActive(user.id);
  }

  @Get(':sessionId')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.trainingService.getSession(user.id, sessionId);
  }

  @Post(':sessionId/pause')
  pause(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.trainingService.changeState(user.id, sessionId, 'pause');
  }

  @Post(':sessionId/resume')
  resume(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.trainingService.changeState(user.id, sessionId, 'resume');
  }

  @Post(':sessionId/abandon')
  abandon(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.trainingService.changeState(user.id, sessionId, 'abandon');
  }

  @Post(':sessionId/items/:itemId/complete-set')
  completeSet(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.trainingService.progressItem(
      user.id,
      sessionId,
      itemId,
      'complete_set',
    );
  }

  @Post(':sessionId/items/:itemId/skip')
  skipItem(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.trainingService.progressItem(
      user.id,
      sessionId,
      itemId,
      'skip',
    );
  }
}
