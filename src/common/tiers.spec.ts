import { tierForPoints } from './tiers';

describe('tierForPoints', () => {
  it('maps points to the right tier at boundaries', () => {
    expect(tierForPoints(0)).toBe('nowicjusz');
    expect(tierForPoints(199)).toBe('nowicjusz');
    expect(tierForPoints(200)).toBe('staly');
    expect(tierForPoints(499)).toBe('staly');
    expect(tierForPoints(500)).toBe('klub');
    expect(tierForPoints(10_000)).toBe('klub');
  });
});
