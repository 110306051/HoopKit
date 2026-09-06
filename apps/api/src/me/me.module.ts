import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { MuxService } from '../media/mux.service';
import { UserClipsController } from './user-clips.controller';
import { UserClipsService } from './user-clips.service';
import { AccountService } from './account.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule],
  controllers: [MeController, UserClipsController, ReportsController],
  providers: [
    MeService,
    MuxService,
    UserClipsService,
    AccountService,
    ReportsService,
  ],
  exports: [UserClipsService],
})
export class MeModule {}
