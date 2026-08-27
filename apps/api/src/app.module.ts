import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ContentModule } from './content/content.module';
import { MeModule } from './me/me.module';
import { TrainingModule } from './training/training.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        'apps/api/.env.local',
        'apps/api/.env',
        '.env.local',
        '.env',
      ],
    }),
    SupabaseModule,
    AuthModule,
    AdminModule,
    ContentModule,
    MeModule,
    TrainingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
