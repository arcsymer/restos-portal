import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

const REWARDS = [
  { code: 'FREE_COMPOTE', name: 'Free fruit compote', costPoints: 50 },
  { code: 'FREE_SOUP', name: 'Free soup', costPoints: 120 },
];

describe('restos-portal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const customerEmail = 'e2e-customer@example.com';
  const staffEmail = 'e2e-staff@example.com';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // clean, deterministic state for a repeatable run
    prisma = app.get(PrismaService);
    await prisma.pointsEntry.deleteMany();
    await prisma.loyaltyAccount.deleteMany();
    await prisma.user.deleteMany();
    for (const r of REWARDS) {
      await prisma.reward.upsert({
        where: { code: r.code },
        update: r,
        create: r,
      });
    }
    await prisma.user.create({
      data: {
        email: staffEmail,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'staff',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('health is public', async () => {
    await request(server())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', service: 'restos-portal' });
  });

  it('rejects unauthenticated access to a protected route', async () => {
    await request(server()).get('/me/account').expect(401);
  });

  let customerAccess = '';
  let customerRefresh = '';

  it('registers a customer and returns tokens', async () => {
    const res = await request(server())
      .post('/auth/register')
      .send({ email: customerEmail, password: 'password123' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    customerAccess = res.body.accessToken;
    customerRefresh = res.body.refreshToken;
  });

  it('rejects a duplicate registration with 409', async () => {
    await request(server())
      .post('/auth/register')
      .send({ email: customerEmail, password: 'password123' })
      .expect(409);
  });

  it('validates DTOs (short password → 400)', async () => {
    await request(server())
      .post('/auth/register')
      .send({ email: 'x@example.com', password: 'short' })
      .expect(400);
  });

  it('new customer starts with zero balance, nowicjusz tier', async () => {
    const res = await request(server())
      .get('/me/account')
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200);
    expect(res.body).toEqual({
      balance: 0,
      lifetimePoints: 0,
      tier: 'nowicjusz',
    });
  });

  it('refresh returns a fresh token pair', async () => {
    const res = await request(server())
      .post('/auth/refresh')
      .send({ refreshToken: customerRefresh })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    customerAccess = res.body.accessToken;
  });

  let staffAccess = '';

  it('staff can log in and earn moves the customer up a tier', async () => {
    const login = await request(server())
      .post('/auth/login')
      .send({ email: staffEmail, password: 'password123' })
      .expect(200);
    staffAccess = login.body.accessToken;

    const res = await request(server())
      .post('/loyalty/earn')
      .set('Authorization', `Bearer ${staffAccess}`)
      .send({ email: customerEmail, points: 250, reason: 'order BMN-0001' })
      .expect(200);
    expect(res.body.balance).toBe(250);
    expect(res.body.lifetimePoints).toBe(250);
    expect(res.body.tier).toBe('staly'); // crossed the 200 threshold
  });

  it('a customer cannot call the staff-only earn route (403)', async () => {
    await request(server())
      .post('/loyalty/earn')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ email: customerEmail, points: 999, reason: 'cheating' })
      .expect(403);
  });

  it('customer redeems an affordable reward; balance drops, tier stays', async () => {
    const res = await request(server())
      .post('/me/redeem')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ rewardCode: 'FREE_SOUP' })
      .expect(200);
    expect(res.body.balance).toBe(130); // 250 - 120
    expect(res.body.tier).toBe('staly'); // lifetime unchanged
  });

  it('rejects an unaffordable redemption with 400', async () => {
    // FREE_SOUP again would need 120; balance is 130 so buy it, then the next is unaffordable
    await request(server())
      .post('/me/redeem')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ rewardCode: 'FREE_SOUP' })
      .expect(200); // balance now 10
    await request(server())
      .post('/me/redeem')
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ rewardCode: 'FREE_SOUP' })
      .expect(400);
  });

  it('ledger lists the entries newest-first', async () => {
    const res = await request(server())
      .get('/me/ledger')
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3); // earn + 2 redeems
    expect(res.body[0].kind).toBe('REDEEM');
  });

  it('throttles repeated logins (429)', async () => {
    let sawTooMany = false;
    for (let i = 0; i < 12; i++) {
      const res = await request(server())
        .post('/auth/login')
        .send({ email: customerEmail, password: 'wrong-password' });
      if (res.status === 429) {
        sawTooMany = true;
        break;
      }
    }
    expect(sawTooMany).toBe(true);
  });
});
