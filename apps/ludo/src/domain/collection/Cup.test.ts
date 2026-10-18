import { cupGameMinutes, parseCupGameLength, QUICK2_ESTIMATE_SECONDS } from './Cup';
import { CUPS } from './thrones';

describe('cup game length', () => {
  it('uses the estimate until enough games have been played', () => {
    expect(cupGameMinutes(null)).toEqual({ game: 6, cup: 12, measured: false });
    expect(cupGameMinutes({ seconds: 900, samples: 3 })).toEqual({
      game: QUICK2_ESTIMATE_SECONDS / 60,
      cup: (QUICK2_ESTIMATE_SECONDS / 60) * 2,
      measured: false,
    });
  });

  it('uses the measured average once it rests on enough games', () => {
    expect(cupGameMinutes({ seconds: 430, samples: 40 })).toEqual({
      game: 7,
      cup: 14,
      measured: true,
    });
    expect(cupGameMinutes({ seconds: 20, samples: 40 })).toEqual({
      game: 1,
      cup: 2,
      measured: true,
    });
  });

  it('reads the server row defensively', () => {
    expect(parseCupGameLength({ variant: 'quick2', seconds: 361.7, samples: 12 })).toEqual({
      seconds: 361,
      samples: 12,
    });
    expect(parseCupGameLength({ seconds: -5, samples: 'x' })).toEqual({ seconds: 0, samples: 0 });
    expect(() => parseCupGameLength(null)).toThrow();
  });
});

describe('cups with friends', () => {
  it('are open in the first five halls only, as on the server (0042)', () => {
    expect(CUPS.map((c) => c.friends)).toEqual([true, true, true, true, true, false, false, false]);
  });
});
