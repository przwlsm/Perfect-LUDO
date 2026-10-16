import {
  isStake,
  MAX_PRIVATE_STAKE,
  STAKES,
  stakeMinLevel,
  stakePrize,
  tablePrize,
} from './Stakes';

describe('stakes', () => {
  it('offers free and five paid tables', () => {
    expect(STAKES).toEqual([0, 100, 500, 2000, 10000, 50000]);
    expect(isStake(500)).toBe(true);
    expect(isStake(250)).toBe(false);
    expect(isStake('500')).toBe(false);
  });

  it('gates the high tables by level and caps private rooms', () => {
    expect(stakeMinLevel(0)).toBe(1);
    expect(stakeMinLevel(2000)).toBe(1);
    expect(stakeMinLevel(10000)).toBe(10);
    expect(stakeMinLevel(50000)).toBe(20);
    expect(MAX_PRIVATE_STAKE).toBe(2000);
  });

  it('pays the winner 90% of the pool, rounded down', () => {
    expect(stakePrize(1000)).toBe(900);
    expect(stakePrize(150)).toBe(135);
    expect(stakePrize(333)).toBe(299);
    expect(stakePrize(-5)).toBe(0);
  });

  it('prices a full table', () => {
    expect(tablePrize(500, 4)).toBe(1800);
    expect(tablePrize(0, 4)).toBe(0);
  });
});
