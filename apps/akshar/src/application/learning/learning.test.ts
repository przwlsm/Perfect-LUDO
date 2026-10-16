import { NO_PROGRESS, recordAttempt } from '@/domain/entities/Progress';
import { lettersOf } from '@/domain/entities/Script';
import { scriptById } from '@/domain/entities/scripts';
import { achievements, letterOfTheDay, nextIndex, recentDays } from './learning';

const noon = (d: number) => new Date(2026, 9, d, 12);

describe('learning', () => {
  it('the letter of the day is stable within a day and from your scripts', () => {
    const a = letterOfTheDay(['kannada', 'tamil'], noon(3));
    expect(letterOfTheDay(['kannada', 'tamil'], new Date(2026, 9, 3, 18))).toEqual(a);
    expect(['kannada', 'tamil']).toContain(a.script);
    expect(a.index).toBeLessThan(lettersOf(scriptById(a.script)).length);
    const days = new Set(
      Array.from({ length: 10 }, (_, i) => JSON.stringify(letterOfTheDay(['tamil'], noon(i + 1)))),
    );
    expect(days.size).toBeGreaterThan(5);
    expect(letterOfTheDay([], noon(1)).script).toBeDefined();
  });

  it('steps through a script and wraps round', () => {
    const n = lettersOf(scriptById('tamil')).length;
    expect(nextIndex('tamil', 0, 1)).toBe(1);
    expect(nextIndex('tamil', 0, -1)).toBe(n - 1);
    expect(nextIndex('tamil', n - 1, 1)).toBe(0);
  });

  it('achievements grow with practice and never go backwards', () => {
    expect(achievements(NO_PROGRESS).every((a) => !a.done)).toBe(true);
    let p = recordAttempt(NO_PROGRESS, 'tamil', 'அ', 3, noon(1));
    p = recordAttempt(p, 'urdu', 'ب', 1, noon(2));
    p = recordAttempt(p, 'urdu', 'پ', 1, noon(4));
    const byId = Object.fromEntries(achievements(p).map((a) => [a.id, a]));
    expect(byId.firstLetter!.done).toBe(true);
    expect(byId.firstMemory!.done).toBe(true);
    expect(byId.twoScripts!.done).toBe(true);
    expect(byId.threeDays!.done).toBe(true);
    expect(byId.tenLetters!.progress).toBeCloseTo(0.3);
    expect(byId.sevenDays!.done).toBe(false);
  });

  it('lists recent practice days, oldest first', () => {
    const p = recordAttempt(NO_PROGRESS, 'tamil', 'அ', 1, noon(10));
    const days = recentDays(p, noon(12), 7);
    expect(days).toEqual([false, false, false, false, true, false, false]);
  });
});
