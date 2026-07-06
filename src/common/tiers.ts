// Loyalty tiers by lifetime points earned. Pure and unit-tested.
export type Tier = 'nowicjusz' | 'staly' | 'klub';

export const TIER_THRESHOLDS: { tier: Tier; min: number }[] = [
  { tier: 'klub', min: 500 },
  { tier: 'staly', min: 200 },
  { tier: 'nowicjusz', min: 0 },
];

export function tierForPoints(lifetimePoints: number): Tier {
  return TIER_THRESHOLDS.find((t) => lifetimePoints >= t.min)!.tier;
}
