import { SEASON_PREMIUM_GEMS, SEASON_TIERS, seasonTierReward } from './Progression';

const total = (premium: boolean, key: 'coins' | 'gems') =>
  Array.from({ length: SEASON_TIERS }, (_, i) => seasonTierReward(i + 1, premium)[key]).reduce(
    (a, b) => a + b,
    0,
  );

describe('season pass', () => {
  it('pays back clearly less gems than it costs, so every season is a real spend', () => {
    expect(total(true, 'gems')).toBe(100);
    expect(total(true, 'gems')).toBeLessThan(SEASON_PREMIUM_GEMS);
  });

  it('saves its biggest gem prize for finishing the season', () => {
    expect(seasonTierReward(SEASON_TIERS, true).gems).toBe(50);
    expect(seasonTierReward(5, true).gems).toBe(10);
    expect(seasonTierReward(4, true).gems).toBe(0);
  });

  it('keeps the free track and the premium coins as they were', () => {
    expect(total(false, 'gems')).toBe(90);
    expect(total(false, 'coins')).toBe(7050);
    expect(total(true, 'coins')).toBe(11475);
  });
});
