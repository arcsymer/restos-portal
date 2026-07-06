import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from './loyalty.service';

/** Mocked-Prisma unit tests for the redeem business rule. */
describe('LoyaltyService.redeem', () => {
  const account = {
    id: 'acc1',
    userId: 'u1',
    tier: 'staly',
    lifetimePoints: 300,
  };
  const reward = {
    id: 'r1',
    code: 'FREE_SOUP',
    name: 'Free soup',
    costPoints: 120,
    active: true,
  };

  function build(balanceSequence: number[]) {
    const prisma = {
      loyaltyAccount: { findUnique: jest.fn().mockResolvedValue(account) },
      reward: { findUnique: jest.fn().mockResolvedValue(reward) },
      pointsEntry: {
        aggregate: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;
    for (const b of balanceSequence) {
      (prisma.pointsEntry.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { points: b },
      });
    }
    return prisma;
  }

  async function makeService(prisma: PrismaService): Promise<LoyaltyService> {
    const moduleRef = await Test.createTestingModule({
      providers: [LoyaltyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    return moduleRef.get(LoyaltyService);
  }

  it('rejects redemption when the balance is too low', async () => {
    const prisma = build([50]); // balance 50 < cost 120
    const service = await makeService(prisma);
    await expect(service.redeem('u1', 'FREE_SOUP')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.pointsEntry.create).not.toHaveBeenCalled();
  });

  it('records a negative REDEEM entry when affordable', async () => {
    const prisma = build([300, 180]); // balance check 300, post-redeem summary 180
    const service = await makeService(prisma);
    const result = await service.redeem('u1', 'FREE_SOUP');
    expect(prisma.pointsEntry.create).toHaveBeenCalledWith({
      data: {
        accountId: 'acc1',
        kind: 'REDEEM',
        points: -120,
        reason: 'redeem FREE_SOUP',
      },
    });
    expect(result.balance).toBe(180);
    expect(result.tier).toBe('staly'); // lifetime unchanged by redeem
  });
});
