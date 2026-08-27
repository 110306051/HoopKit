import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import type { AuthUser } from '../../auth/auth-user';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { EditorialService } from './editorial.service';
import { SaveMoveDto, SaveWorkoutTemplateDto } from './editorial.dto';

@Controller('admin/editorial')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class EditorialController {
  constructor(private readonly editorialService: EditorialService) {}

  @Get('options')
  getOptions() {
    return this.editorialService.getOptions();
  }

  @Get('moves')
  listMoves() {
    return this.editorialService.listMoves();
  }

  @Get('moves/:id')
  getMove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.editorialService.getMove(id);
  }

  @Post('moves')
  createMove(@Body() input: SaveMoveDto, @CurrentUser() user: AuthUser) {
    return this.editorialService.saveMove(null, input, user.id);
  }

  @Put('moves/:id')
  updateMove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: SaveMoveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.editorialService.saveMove(id, input, user.id);
  }

  @Get('workouts')
  listWorkouts() {
    return this.editorialService.listWorkouts();
  }

  @Get('workouts/:id')
  getWorkout(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.editorialService.getWorkout(id);
  }

  @Post('workouts')
  createWorkout(
    @Body() input: SaveWorkoutTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.editorialService.saveWorkout(null, input, user.id);
  }

  @Put('workouts/:id')
  updateWorkout(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: SaveWorkoutTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.editorialService.saveWorkout(id, input, user.id);
  }
}
