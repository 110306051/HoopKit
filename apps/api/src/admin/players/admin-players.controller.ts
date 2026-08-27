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
import { AdminPlayersService } from './admin-players.service';
import { SavePlayerDto } from './player.dto';

@Controller('admin/players')
@UseGuards(AuthGuard, RolesGuard)
@Roles('editor', 'admin')
export class AdminPlayersController {
  constructor(private readonly playersService: AdminPlayersService) {}

  @Get()
  listPlayers() {
    return this.playersService.listPlayers();
  }

  @Get(':id')
  getPlayer(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.playersService.getPlayer(id);
  }

  @Post()
  createPlayer(@Body() input: SavePlayerDto, @CurrentUser() user: AuthUser) {
    return this.playersService.createPlayer(input, user.id);
  }

  @Put(':id')
  updatePlayer(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: SavePlayerDto,
  ) {
    return this.playersService.updatePlayer(id, input);
  }
}
