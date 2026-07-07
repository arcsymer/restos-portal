import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('GraphQL gateway (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const customerEmail = 'gql-customer@example.com';
  const staffEmail = 'gql-staff@example.com';
  let customerToken = '';
  let staffToken = '';

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

    prisma = app.get(PrismaService);
    await prisma.pointsEntry.deleteMany();
    await prisma.loyaltyAccount.deleteMany();
    await prisma.user.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.reward.upsert({
      where: { code: 'FREE_SOUP' },
      update: {},
      create: { code: 'FREE_SOUP', name: 'Free soup', costPoints: 120 },
    });
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
  const gql = (query: string, token?: string) => {
    const r = request(server()).post('/graphql');
    if (token) r.set('Authorization', `Bearer ${token}`);
    return r.send({ query });
  };

  it('registers a customer and logs in staff (REST auth)', async () => {
    const c = await request(server())
      .post('/auth/register')
      .send({ email: customerEmail, password: 'password123' })
      .expect(201);
    customerToken = c.body.accessToken;
    const s = await request(server())
      .post('/auth/login')
      .send({ email: staffEmail, password: 'password123' })
      .expect(200);
    staffToken = s.body.accessToken;
  });

  it('rejects an unauthenticated query', async () => {
    const res = await gql('{ myAccount { balance } }').expect(200);
    expect(res.body.errors).toBeDefined();
    expect(res.body.data?.myAccount).toBeFalsy();
  });

  it('myAccount returns the new customer summary', async () => {
    const res = await gql(
      '{ myAccount { balance lifetimePoints tier } }',
      customerToken,
    ).expect(200);
    expect(res.body.data.myAccount).toEqual({
      balance: 0,
      lifetimePoints: 0,
      tier: 'nowicjusz',
    });
  });

  it('rewards query lists the catalog', async () => {
    const res = await gql(
      '{ rewards { code costPoints } }',
      customerToken,
    ).expect(200);
    expect(res.body.data.rewards).toEqual([
      { code: 'FREE_SOUP', costPoints: 120 },
    ]);
  });

  it('a customer cannot call the staff-only earn mutation', async () => {
    const res = await gql(
      `mutation { earn(email: "${customerEmail}", points: 200, reason: "x") { balance } }`,
      customerToken,
    ).expect(200);
    expect(res.body.errors?.[0]?.message).toMatch(/insufficient role/i);
  });

  it('staff earn then customer redeem via GraphQL', async () => {
    const earn = await gql(
      `mutation { earn(email: "${customerEmail}", points: 200, reason: "order") { balance tier } }`,
      staffToken,
    ).expect(200);
    expect(earn.body.data.earn).toEqual({ balance: 200, tier: 'staly' });

    const redeem = await gql(
      'mutation { redeem(rewardCode: "FREE_SOUP") { balance tier } }',
      customerToken,
    ).expect(200);
    expect(redeem.body.data.redeem).toEqual({ balance: 80, tier: 'staly' });
  });
});
