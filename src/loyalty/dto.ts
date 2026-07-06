import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsString, Max, Min } from 'class-validator';

export class EarnDto {
  @ApiProperty({
    example: 'anna@example.com',
    description: 'customer to credit',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 40, minimum: 1, maximum: 100000 })
  @IsInt()
  @Min(1)
  @Max(100000)
  points!: number;

  @ApiProperty({ example: 'order BMN-0007' })
  @IsString()
  reason!: string;
}

export class RedeemDto {
  @ApiProperty({ example: 'FREE_COMPOTE' })
  @IsString()
  rewardCode!: string;
}
