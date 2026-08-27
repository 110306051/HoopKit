import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/v1/health/live')
      .expect(200)
      .expect({ status: 'ok', service: 'hoopkit-api' });
  });

  it('/auth/me rejects an unauthenticated request', () => {
    return request(app.getHttpServer()).get('/v1/auth/me').expect(401);
  });

  it('/admin/content rejects an unauthenticated request', () => {
    return request(app.getHttpServer()).get('/v1/admin/content').expect(401);
  });

  it('/admin/players rejects an unauthenticated write', () => {
    return request(app.getHttpServer())
      .post('/v1/admin/players')
      .send({})
      .expect(401);
  });

  it('/admin/editorial/moves rejects an unauthenticated write', () => {
    return request(app.getHttpServer())
      .post('/v1/admin/editorial/moves')
      .send({})
      .expect(401);
  });

  it('/admin/editorial/workouts rejects an unauthenticated write', () => {
    return request(app.getHttpServer())
      .post('/v1/admin/editorial/workouts')
      .send({})
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
