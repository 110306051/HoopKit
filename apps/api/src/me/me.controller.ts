import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CloneTemplateDto,
  CreatePlanDto,
  CreatePlanItemDto,
  DeleteAccountDto,
  ReorderIdsDto,
  SaveSectionDto,
  UpdatePlanDto,
  UpdatePlanItemDto,
  UpdateProfileDto,
} from './me.dto';
import { MeService } from './me.service';
import { AccountService } from './account.service';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly accountService: AccountService,
  ) {}

  @Get()
  overview(@CurrentUser() user: AuthUser) {
    return this.meService.getOverview(user);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthUser, @Body() body: UpdateProfileDto) {
    return this.meService.updateProfile(user.id, body);
  }

  @Delete('account')
  deleteAccount(@CurrentUser() user: AuthUser, @Body() body: DeleteAccountDto) {
    void body;
    return this.accountService.deleteAccount(user.id);
  }

  @Put('favorite-moves/:moveId')
  favoriteMove(
    @CurrentUser() user: AuthUser,
    @Param('moveId', ParseUUIDPipe) moveId: string,
  ) {
    return this.meService.favoriteMove(user.id, moveId);
  }

  @Delete('favorite-moves/:moveId')
  unfavoriteMove(
    @CurrentUser() user: AuthUser,
    @Param('moveId', ParseUUIDPipe) moveId: string,
  ) {
    return this.meService.unfavoriteMove(user.id, moveId);
  }

  @Put('favorite-workouts/:templateId')
  favoriteWorkout(
    @CurrentUser() user: AuthUser,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.meService.favoriteWorkout(user.id, templateId);
  }

  @Delete('favorite-workouts/:templateId')
  unfavoriteWorkout(
    @CurrentUser() user: AuthUser,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.meService.unfavoriteWorkout(user.id, templateId);
  }

  @Post('workout-plans')
  createPlan(@CurrentUser() user: AuthUser, @Body() body: CreatePlanDto) {
    return this.meService.createPlan(user.id, body);
  }

  @Get('workout-plans/:planId')
  getPlan(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.meService.getPlan(user.id, planId);
  }

  @Patch('workout-plans/:planId')
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: UpdatePlanDto,
  ) {
    return this.meService.updatePlan(user.id, planId, body);
  }

  @Delete('workout-plans/:planId')
  deletePlan(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
  ) {
    return this.meService.deletePlan(user.id, planId);
  }

  @Post('workout-plans/:planId/sections')
  createSection(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: SaveSectionDto,
  ) {
    return this.meService.createSection(user.id, planId, body);
  }

  @Patch('workout-plans/:planId/sections/:sectionId')
  updateSection(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: SaveSectionDto,
  ) {
    return this.meService.updateSection(user.id, planId, sectionId, body);
  }

  @Delete('workout-plans/:planId/sections/:sectionId')
  deleteSection(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.meService.deleteSection(user.id, planId, sectionId);
  }

  @Put('workout-plans/:planId/sections/reorder')
  reorderSections(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() body: ReorderIdsDto,
  ) {
    return this.meService.reorderSections(user.id, planId, body.ids);
  }

  @Post('workout-plans/:planId/sections/:sectionId/items')
  createItem(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: CreatePlanItemDto,
  ) {
    return this.meService.createItem(user.id, planId, sectionId, body);
  }

  @Patch('workout-plans/:planId/items/:itemId')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdatePlanItemDto,
  ) {
    return this.meService.updateItem(user.id, planId, itemId, body);
  }

  @Delete('workout-plans/:planId/items/:itemId')
  deleteItem(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.meService.deleteItem(user.id, planId, itemId);
  }

  @Put('workout-plans/:planId/sections/:sectionId/items/reorder')
  reorderItems(
    @CurrentUser() user: AuthUser,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: ReorderIdsDto,
  ) {
    return this.meService.reorderItems(user.id, planId, sectionId, body.ids);
  }

  @Post('workout-plans/from-template/:templateId')
  cloneTemplate(
    @CurrentUser() user: AuthUser,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() body: CloneTemplateDto,
  ) {
    return this.meService.cloneTemplate(user.id, templateId, body.name);
  }
}
