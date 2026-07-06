import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators';
import type { AuthUser } from '../auth/decorators';
import { EarnDto, RedeemDto } from './dto';
import { AccountSummary, LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller()
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me/account')
  account(@CurrentUser() user: AuthUser): Promise<AccountSummary> {
    return this.loyalty.summary(user.userId);
  }

  @Get('me/ledger')
  ledger(@CurrentUser() user: AuthUser) {
    return this.loyalty.ledger(user.userId);
  }

  @Get('rewards')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30_000)
  rewards() {
    return this.loyalty.listRewards();
  }

  @Post('me/redeem')
  @HttpCode(200)
  redeem(
    @CurrentUser() user: AuthUser,
    @Body() dto: RedeemDto,
  ): Promise<AccountSummary> {
    return this.loyalty.redeem(user.userId, dto.rewardCode);
  }

  @Roles('staff')
  @Post('loyalty/earn')
  @HttpCode(200)
  earn(@Body() dto: EarnDto): Promise<AccountSummary> {
    return this.loyalty.earn(dto.email, dto.points, dto.reason);
  }
}
