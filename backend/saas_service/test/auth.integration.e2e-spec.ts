import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'test-secret';
const SUFFIX = '@integration-saas.test';

describe('Auth integration (saas_service)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let registeredToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    await dataSource.query(`DELETE FROM sass_users WHERE email LIKE '%${SUFFIX}'`);
  }, 30_000);

  afterAll(async () => {
    await dataSource.query(`DELETE FROM sass_users WHERE email LIKE '%${SUFFIX}'`);
    await app.close();
  });

  // ─── register ─────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('201 — creates account and returns JWT + user payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({
          email: `alice${SUFFIX}`,
          password: 'StrongPass@1',
          firstName: 'Alice',
          lastName: 'Test',
        })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe(`alice${SUFFIX}`);
      expect(res.body.user.role).toBe('owner');
      expect(res.body.user).not.toHaveProperty('password');
      registeredToken = res.body.access_token;
    });

    it('409 — duplicate email returns ConflictException', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({
          email: `dup${SUFFIX}`,
          password: 'StrongPass@1',
          firstName: 'Dup',
          lastName: 'User',
        });

      await request(app.getHttpServer())
        .post('/auth/register')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({
          email: `dup${SUFFIX}`,
          password: 'StrongPass@1',
          firstName: 'Dup',
          lastName: 'User',
        })
        .expect(409);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('200 — valid credentials return JWT and saas_user type', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({ email: `alice${SUFFIX}`, password: 'StrongPass@1' })
        .expect(200);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.type).toBe('saas_user');
      expect(res.body.user.email).toBe(`alice${SUFFIX}`);
    });

    it('401 — wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({ email: `alice${SUFFIX}`, password: 'wrongpassword' })
        .expect(401);
    });

    it('401 — non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({ email: `nobody${SUFFIX}`, password: 'whatever' })
        .expect(401);
    });
  });

  // ─── JWT-protected route ───────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('401 — no token returns Unauthorized', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .expect(401);
    });

    it('200 — valid token returns profile without password', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .set('Authorization', `Bearer ${registeredToken}`)
        .expect(200);

      expect(res.body.email).toBe(`alice${SUFFIX}`);
      expect(res.body).not.toHaveProperty('password');
    });
  });

  // ─── firebase/login — empty token ─────────────────────────────────────────

  describe('POST /auth/firebase/login', () => {
    it('400 — empty token is rejected by validation before Firebase call', () => {
      return request(app.getHttpServer())
        .post('/auth/firebase/login')
        .set('x-gateway-secret', GATEWAY_SECRET)
        .send({ idToken: '' })
        .expect(400);
    });
  });
});
