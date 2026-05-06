import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'test-secret';

describe('Auth integration (institute_service)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Public institute info endpoints ──────────────────────────────────────

  describe('GET /auth/institutes/:id/info', () => {
    it('404 — non-existent institute ID is handled gracefully', () => {
      return request(app.getHttpServer())
        .get('/auth/institutes/00000000-0000-0000-0000-000000000000/info')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .expect(404);
    });
  });

  describe('GET /auth/institutes/:id/courses', () => {
    it('404 — non-existent institute returns 404', () => {
      return request(app.getHttpServer())
        .get('/auth/institutes/00000000-0000-0000-0000-000000000000/courses')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .expect(404);
    });
  });

  describe('GET /auth/institutes/:id/voice-config', () => {
    it('404 — non-existent institute returns 404', () => {
      return request(app.getHttpServer())
        .get('/auth/institutes/00000000-0000-0000-0000-000000000000/voice-config')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .expect(404);
    });
  });

  // ─── JWT-protected routes return 401 without token ────────────────────────

  describe('GET /auth/me', () => {
    it('401 — no token returns Unauthorized', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .expect(401);
    });
  });

  describe('GET /auth/roles', () => {
    it('401 — protected route blocks unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/auth/roles')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .expect(401);
    });
  });

  // ─── firebase/login — empty token rejected before Firebase ────────────────

  describe('POST /auth/firebase/login', () => {
    it('401 — empty token rejected without hitting Firebase', () => {
      return request(app.getHttpServer())
        .post('/auth/firebase/login')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({ idToken: '' })
        .expect(401);
    });
  });

  // ─── Database connectivity sanity check ──────────────────────────────────

  describe('Database', () => {
    it('institute roles are seeded on startup (instructor, teacher, student)', async () => {
      const roles = await dataSource.query(
        `SELECT name FROM institute_roles ORDER BY name`,
      );
      const roleNames = roles.map((r: any) => r.name);
      expect(roleNames).toContain('instructor');
      expect(roleNames).toContain('teacher');
      expect(roleNames).toContain('student');
    });
  });
});
