import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Rewards a customer can redeem points for — themed on the Bar Mleczny Nowa menu.
const REWARDS = [
  { code: 'FREE_COMPOTE', name: 'Free fruit compote (Kompot)', costPoints: 50 },
  { code: 'FREE_SOUP', name: 'Free soup of the day', costPoints: 120 },
  { code: 'FREE_PIEROGI', name: 'Free pierogi ruskie (8 pcs)', costPoints: 220 },
  { code: 'FREE_SCHABOWY', name: 'Free kotlet schabowy', costPoints: 280 },
];

async function main() {
  for (const r of REWARDS) {
    await prisma.reward.upsert({ where: { code: r.code }, update: r, create: r });
  }

  // Demo accounts (idempotent). Password is public demo data, documented in the README.
  const passwordHash = await bcrypt.hash('password123', 10);

  const customer = await prisma.user.upsert({
    where: { email: 'anna@example.com' },
    update: {},
    create: {
      email: 'anna@example.com',
      passwordHash,
      role: 'customer',
      account: { create: { tier: 'nowicjusz' } },
    },
    include: { account: true },
  });

  await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: { email: 'staff@example.com', passwordHash, role: 'staff' },
  });

  // Give the demo customer a welcome bonus once.
  if (customer.account) {
    const existing = await prisma.pointsEntry.count({
      where: { accountId: customer.account.id },
    });
    if (existing === 0) {
      await prisma.pointsEntry.create({
        data: {
          accountId: customer.account.id,
          kind: 'EARN',
          points: 150,
          reason: 'welcome bonus',
        },
      });
      await prisma.loyaltyAccount.update({
        where: { id: customer.account.id },
        data: { lifetimePoints: 150 },
      });
    }
  }

  console.log(`seeded ${REWARDS.length} rewards + demo customer/staff`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
