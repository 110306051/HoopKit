import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ContentModule } from './content/content.module';
import { MeModule } from './me/me.module';
import { TrainingModule } from './training/training.module';
import { validateEnvironment } from './config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: [
        'apps/api/.env.local',
        'apps/api/.env',
        '.env.local',
        '.env',
      ],
    }),
    SentryModule.forRoot(),
    SupabaseModule,
    AuthModule,
    AdminModule,
    ContentModule,
    MeModule,
    TrainingModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
