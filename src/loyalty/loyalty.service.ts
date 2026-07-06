import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Tier, tierForPoints } from '../common/tiers';
import { PrismaService } from '../prisma/prisma.service';

export interface AccountSummary {
  balance: number;
  lifetimePoints: number;
  tier: Tier;
}

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  private async accountByUserId(userId: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
    });
    if (!account) {
      throw new NotFoundException('loyalty account not found');
    }
    return account;
  }

  private async balanceOf(accountId: string): Promise<number> {
    const agg = await this.prisma.pointsEntry.aggregate({
      where: { accountId },
      _sum: { points: true },
    });
    return agg._sum.points ?? 0;
  }

  async summary(userId: string): Promise<AccountSummary> {
    const account = await this.accountByUserId(userId);
    return {
      balance: await this.balanceOf(account.id),
      lifetimePoints: account.lifetimePoints,
      tier: tierForPoints(account.lifetimePoints),
    };
  }

  async ledger(userId: string) {
    const account = await this.accountByUserId(userId);
    return this.prisma.pointsEntry.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listRewards() {
    return this.prisma.reward.findMany({
      where: { active: true },
      orderBy: { costPoints: 'asc' },
    });
  }

  /** Staff/system credits a customer; bumps lifetime points (and therefore tier). */
  async earn(
    email: string,
    points: number,
    reason: string,
  ): Promise<AccountSummary> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { account: true },
    });
    if (!user || !user.account) {
      throw new NotFoundException('customer not found');
    }
    const accountId = user.account.id;
    await this.prisma.$transaction([
      this.prisma.pointsEntry.create({
        data: { accountId, kind: 'EARN', points, reason },
      }),
      this.prisma.loyaltyAccount.update({
        where: { id: accountId },
        data: {
          lifetimePoints: { increment: points },
          tier: tierForPoints(user.account.lifetimePoints + points),
        },
      }),
    ]);
    return this.summary(user.id);
  }

  /** Customer redeems a reward if they can afford it. Lifetime points are unchanged. */
  async redeem(userId: string, rewardCode: string): Promise<AccountSummary> {
    const account = await this.accountByUserId(userId);
    const reward = await this.prisma.reward.findUnique({
      where: { code: rewardCode },
    });
    if (!reward || !reward.active) {
      throw new NotFoundException('reward not found');
    }
    const balance = await this.balanceOf(account.id);
    if (balance < reward.costPoints) {
      throw new BadRequestException(
        `insufficient points: have ${balance}, need ${reward.costPoints}`,
      );
    }
    await this.prisma.pointsEntry.create({
      data: {
        accountId: account.id,
        kind: 'REDEEM',
        points: -reward.costPoints,
        reason: `redeem ${reward.code}`,
      },
    });
    return this.summary(userId);
  }
}
