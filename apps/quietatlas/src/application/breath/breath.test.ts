import { breathAt, cycleSeconds, PATTERNS } from './breath';

const calm = PATTERNS.find((p) => p.id === 'calm')!;
const box = PATTERNS.find((p) => p.id === 'box')!;

describe('breath', () => {
  it('knows a cycle length', () => {
    expect(cycleSeconds(calm)).toBe(10);
    expect(cycleSeconds(box)).toBe(16);
  });

  it('breathes in, then out, skipping empty phases', () => {
    expect(breathAt(calm, 0).phase).toBe('in');
    expect(breathAt(calm, 3_900).phase).toBe('in');
    expect(breathAt(calm, 4_100).phase).toBe('out');
    expect(breathAt(calm, 9_900).phase).toBe('out');
    expect(breathAt(calm, 10_100)).toMatchObject({ phase: 'in', cycle: 1 });
  });

  it('walks through all four phases of a box breath', () => {
    expect([1, 5, 9, 13].map((s) => breathAt(box, s * 1000).phase)).toEqual([
      'in',
      'hold',
      'out',
      'rest',
    ]);
  });

  it('fills up on the in-breath and empties on the out-breath', () => {
    expect(breathAt(calm, 0).fullness).toBe(0);
    expect(breathAt(calm, 4_000).fullness).toBeCloseTo(1, 1);
    expect(breathAt(box, 6_000).fullness).toBe(1);
    expect(breathAt(calm, 9_999).fullness).toBeCloseTo(0, 1);
  });

  it('counts down whole seconds', () => {
    expect(breathAt(calm, 0).secondsLeft).toBe(4);
    expect(breathAt(calm, 3_500).secondsLeft).toBe(1);
  });
});
