import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminContentController } from './content/admin-content.controller';
import { AdminContentService } from './content/admin-content.service';
import { AdminPlayersController } from './players/admin-players.controller';
import { AdminPlayersService } from './players/admin-players.service';
import { AdminMediaController } from './media/admin-media.controller';
import { AdminMediaService } from './media/admin-media.service';
import { MuxWebhookController } from './media/mux-webhook.controller';
import { MuxService } from '../media/mux.service';
import { EditorialController } from './content/editorial.controller';
import { EditorialService } from './content/editorial.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminController,
    AdminContentController,
    AdminPlayersController,
    AdminMediaController,
    MuxWebhookController,
    EditorialController,
  ],
  providers: [
    AdminService,
    AdminContentService,
    AdminPlayersService,
    AdminMediaService,
    MuxService,
    EditorialService,
  ],
})
export class AdminModule {}
