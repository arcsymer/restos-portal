import { Module } from '@nestjs/common';
import { LoyaltyResolver } from '../graphql/loyalty.resolver';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService, LoyaltyResolver],
})
export class LoyaltyModule {}
