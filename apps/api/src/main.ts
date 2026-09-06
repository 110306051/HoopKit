import './instrument';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? config.get<number>('API_PORT')!;
  const host = config.get<string>('API_HOST') ?? '0.0.0.0';

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGINS')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(port, host);
}

void bootstrap();
