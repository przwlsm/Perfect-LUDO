import { random } from '../random';
import { bubbleAt, makeSheet } from './sheet';

describe('bubble sheet', () => {
  it('is the same sheet for the same seed', () => {
    expect(makeSheet(360, 600, 7)).toEqual(makeSheet(360, 600, 7));
    expect(makeSheet(360, 600, 7)).not.toEqual(makeSheet(360, 600, 8));
  });

  it('keeps every bubble inside the sheet and none overlapping', () => {
    const { bubbles } = makeSheet(360, 640, 1);
    expect(bubbles.length).toBeGreaterThan(30);
    for (const b of bubbles) {
      expect(b.x - b.r).toBeGreaterThanOrEqual(0);
      expect(b.x + b.r).toBeLessThanOrEqual(360);
      expect(b.y - b.r).toBeGreaterThanOrEqual(0);
      expect(b.y + b.r).toBeLessThanOrEqual(640);
    }
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i]!;
        const b = bubbles[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r - 0.01);
      }
    }
  });

  it('finds the bubble under a finger', () => {
    const sheet = makeSheet(360, 640, 1);
    const b = sheet.bubbles[5]!;
    expect(bubbleAt(sheet, b.x, b.y)).toBe(5);
    expect(bubbleAt(sheet, -50, -50)).toBe(-1);
  });

  it('hides a golden bubble now and then', () => {
    let golden = 0;
    for (let seed = 0; seed < 40; seed++) {
      golden += makeSheet(360, 640, seed).bubbles.filter((b) => b.golden).length;
    }
    expect(golden).toBeGreaterThan(5);
  });

  it('random numbers stay in [0, 1)', () => {
    const r = random(3);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
