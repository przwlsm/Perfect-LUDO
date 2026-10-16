import {
  columnOf,
  columnRange,
  isValidTicket,
  ticketNumbers,
  type TicketGrid,
} from '@/domain/entities/Ticket';
import { generateStrip, generateTicket, STRIP_SIZE } from './tickets';

describe('generateTicket', () => {
  it('always makes a valid standard ticket', () => {
    for (let seed = 0; seed < 3000; seed++) {
      const t = generateTicket(seed);
      expect(isValidTicket(t)).toBe(true);
    }
  });

  it('is deterministic: the same seed gives the same ticket', () => {
    expect(generateTicket(12345)).toEqual(generateTicket(12345));
    expect(generateTicket(12345)).not.toEqual(generateTicket(12346));
  });

  it('puts every number in its column range, ascending top to bottom', () => {
    const t = generateTicket(77);
    for (let c = 0; c < 9; c++) {
      const [lo, hi] = columnRange(c);
      const col = t.map((r) => r[c]).filter((v): v is number => v !== null);
      expect(col.length).toBeGreaterThanOrEqual(1);
      expect(col.length).toBeLessThanOrEqual(3);
      expect([...col].sort((a, b) => a - b)).toEqual(col);
      for (const v of col) {
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
        expect(columnOf(v)).toBe(c);
      }
    }
  });
});

describe('generateStrip', () => {
  it('makes six valid tickets that use 1–90 exactly once', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const strip = generateStrip(seed * 7919 + 3);
      expect(strip).toHaveLength(STRIP_SIZE);
      for (const t of strip) expect(isValidTicket(t)).toBe(true);
      const all = strip.flatMap(ticketNumbers).sort((a, b) => a - b);
      expect(all).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
    }
  });

  it('sometimes fills a whole column of a ticket (three numbers), like real strips', () => {
    let sawThree = false;
    for (let seed = 0; seed < 200 && !sawThree; seed++) {
      for (const t of generateStrip(seed)) {
        for (let c = 0; c < 9; c++) if (t.every((r) => r[c] !== null)) sawThree = true;
      }
    }
    expect(sawThree).toBe(true);
  });

  it('varies the layout between seeds', () => {
    const shape = (t: TicketGrid) =>
      t.map((r) => r.map((c) => (c === null ? 0 : 1)).join('')).join('|');
    const shapes = new Set<string>();
    for (let seed = 0; seed < 50; seed++) shapes.add(shape(generateTicket(seed)));
    expect(shapes.size).toBeGreaterThan(40);
  });
});

describe('isValidTicket', () => {
  const good = generateTicket(1);
  it('rejects a row with the wrong count', () => {
    const bad = good.map((r) => [...r]);
    const firstEmpty = bad[0]!.indexOf(null);
    bad[0]![firstEmpty] = 1;
    expect(isValidTicket(bad)).toBe(false);
  });
  it('rejects a number in the wrong column', () => {
    const bad = good.map((r) => [...r]);
    const c = bad[0]!.findIndex((v) => v !== null);
    bad[0]![c] = c === 8 ? 5 : 90;
    expect(isValidTicket(bad)).toBe(false);
  });
  it('rejects a column that is not ascending', () => {
    // Find a column with two numbers and swap them.
    const bad = good.map((r) => [...r]);
    for (let c = 0; c < 9; c++) {
      const rows = [0, 1, 2].filter((r) => bad[r]![c] !== null);
      if (rows.length >= 2) {
        const [a, b] = [rows[0]!, rows[1]!];
        const tmp = bad[a]![c]!;
        bad[a]![c] = bad[b]![c]!;
        bad[b]![c] = tmp;
        break;
      }
    }
    expect(isValidTicket(bad)).toBe(false);
  });
  it('rejects the wrong shape', () => {
    expect(isValidTicket(good.slice(0, 2))).toBe(false);
  });
});
