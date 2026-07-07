import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/decorators';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { AccountSummaryModel, LedgerEntryModel, RewardModel } from './models';

// GraphQL gateway over the same LoyaltyService the REST API uses. Global JWT + role guards apply
// (they are execution-context aware), so these are protected exactly like the REST routes.
@Resolver()
export class LoyaltyResolver {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Query(() => AccountSummaryModel, {
    description: 'The signed-in customer’s loyalty account.',
  })
  myAccount(@CurrentUser() user: AuthUser): Promise<AccountSummaryModel> {
    return this.loyalty.summary(user.userId);
  }

  @Query(() => [RewardModel], { description: 'The active rewards catalog.' })
  rewards(): Promise<RewardModel[]> {
    return this.loyalty.listRewards();
  }

  @Query(() => [LedgerEntryModel], {
    description: 'The signed-in customer’s points history.',
  })
  ledger(@CurrentUser() user: AuthUser): Promise<LedgerEntryModel[]> {
    return this.loyalty.ledger(user.userId);
  }

  @Mutation(() => AccountSummaryModel, {
    description: 'Redeem a reward with points.',
  })
  redeem(
    @CurrentUser() user: AuthUser,
    @Args('rewardCode') rewardCode: string,
  ): Promise<AccountSummaryModel> {
    return this.loyalty.redeem(user.userId, rewardCode);
  }

  @Roles('staff')
  @Mutation(() => AccountSummaryModel, {
    description: 'Staff: credit a customer’s points.',
  })
  earn(
    @Args('email') email: string,
    @Args('points', { type: () => Int }) points: number,
    @Args('reason') reason: string,
  ): Promise<AccountSummaryModel> {
    return this.loyalty.earn(email, points, reason);
  }
}
