import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('AccountSummary')
export class AccountSummaryModel {
  @Field(() => Int) balance!: number;
  @Field(() => Int) lifetimePoints!: number;
  @Field() tier!: string;
}

@ObjectType('Reward')
export class RewardModel {
  @Field() id!: string;
  @Field() code!: string;
  @Field() name!: string;
  @Field(() => Int) costPoints!: number;
}

@ObjectType('LedgerEntry')
export class LedgerEntryModel {
  @Field() id!: string;
  @Field() kind!: string;
  @Field(() => Int) points!: number;
  @Field() reason!: string;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}
