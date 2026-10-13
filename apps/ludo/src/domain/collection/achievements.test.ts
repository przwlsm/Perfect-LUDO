import { ACHIEVEMENTS, getAchievement, nextThreshold, tierProgress } from './achievements';
import { CUPS } from './thrones';

// Jest runs on Node, but the app's tsconfig has no Node types: only what
// this test needs is declared.
declare function require(id: 'fs'): { readFileSync(path: string, encoding: 'utf8'): string };
declare const __dirname: string;

/** The server's catalogue (0034), as `('id', 'event', 'mode', '{a,b,c,d}')` rows. */
function serverRows() {
  const sql = require('fs').readFileSync(
    `${__dirname}/../../../supabase/migrations/0034_collection.sql`,
    'utf8',
  );
  const rows = new Map<string, { event: string; mode: string; thresholds: number[] }>();
  for (const m of sql.matchAll(/\('([a-z-]+)',\s*'(\w+)',\s*'(sum|max)',\s*'\{([\d,]+)\}'\)/g)) {
    rows.set(m[1]!, { event: m[2]!, mode: m[3]!, thresholds: m[4]!.split(',').map(Number) });
  }
  return rows;
}

describe('achievements catalogue', () => {
  it('matches the server catalogue id for id', () => {
    const server = serverRows();
    expect([...server.keys()].sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());
    for (const a of ACHIEVEMENTS) {
      expect(server.get(a.id)).toEqual({
        event: a.event,
        mode: a.mode,
        thresholds: [...a.thresholds],
      });
    }
  });

  it('has rising thresholds and unique ids', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      for (let i = 1; i < 4; i += 1) expect(a.thresholds[i]!).toBeGreaterThan(a.thresholds[i - 1]!);
    }
  });

  it('measures progress toward the next tier', () => {
    const def = getAchievement('champion')!;
    expect(nextThreshold(def, 0)).toBe(1);
    expect(nextThreshold(def, 4)).toBeNull();
    expect(tierProgress(def, 0, 0)).toBe(0);
    expect(tierProgress(def, 1, 13)).toBeCloseTo(0.5);
    expect(tierProgress(def, 4, 9999)).toBe(1);
  });

  it('pays each cup three entries to the winner and the entry back to the runner-up', () => {
    for (const cup of CUPS.slice(1)) {
      expect(cup.prize).toBe(cup.entry * 3);
      expect(cup.runnerUp).toBe(cup.entry);
    }
  });
});
