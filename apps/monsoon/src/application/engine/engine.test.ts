import { random } from 'app-kit';
import {
  isFixed,
  openings,
  period,
  rotateMask,
  sameFacing,
  tapsBetween,
  turnsToSolve,
  type Level,
  type Tile,
} from '@/domain/entities/Board';
import { encodeLevel } from '../levels/codec';
import { HOW_BOARDS, parseBoard } from '../levels/handmade';
import { flow, RAIN_BIT, TANK_BIT } from './flow';
import { generate, type LevelSpec } from './generator';
import { solve } from './solver';

/** Every cell at its solved orientation. */
const solvedRot = (l: Level) => l.tiles.map(() => 0);

/** Counts answers by trying every rotation of every tile: the ground truth for small boards. */
function bruteCount(level: Level): number {
  const cells = level.tiles
    .map((_, a) => a)
    .filter((a) => period(level.tiles[a]!) > 1 && !isFixed(level.tiles[a]!));
  const rot = level.tiles.map((t, a) => (isFixed(t) ? level.start[a]! : 0));
  let count = 0;
  const walk = (i: number) => {
    if (i === cells.length) {
      if (flow(level, rot).solved) count++;
      return;
    }
    const a = cells[i]!;
    for (let r = 0; r < period(level.tiles[a]!); r++) {
      rot[a] = r;
      walk(i + 1);
    }
    rot[a] = 0;
  };
  walk(0);
  return count;
}

describe('tiles', () => {
  it('turn clockwise: north opens east', () => {
    expect(rotateMask(0b0001, 1)).toBe(0b0010);
    expect(rotateMask(0b1000, 1)).toBe(0b0001);
    expect(rotateMask(0b0011, 3)).toBe(0b1001);
  });

  it('know how many ways round they can face', () => {
    const pipe = (mask: number): Tile => ({ kind: 'pipe', mask, fixed: false });
    expect(period(pipe(0b0101))).toBe(2); // straight
    expect(period(pipe(0b0011))).toBe(4); // bend
    expect(period(pipe(0b1111))).toBe(1); // cross
    expect(period({ kind: 'dam', out: 1, fixed: false })).toBe(4); // its arrow matters
    expect(period({ kind: 'bridge' })).toBe(1);
    expect(sameFacing(pipe(0b0101), 1, 3)).toBe(true);
    expect(tapsBetween(pipe(0b0011), 1, 0)).toBe(3);
    expect(tapsBetween(pipe(0b0101), 1, 0)).toBe(1);
  });

  it('a check-dam is a straight channel whichever way it faces', () => {
    const dam: Tile = { kind: 'dam', out: 1, fixed: false };
    expect(openings(dam, 0)).toBe(0b1010);
    expect(openings(dam, 1)).toBe(0b0101);
  });
});

describe('flow', () => {
  const line = parseBoard('line', ['s20 pA1 f80']);

  it('carries rain from the spring to a field when the channel lines up', () => {
    const before = flow(line, line.start);
    expect(before.solved).toBe(false);
    expect(before.fields.get(2)).toBe('dry');
    const after = flow(line, solvedRot(line));
    expect(after.solved).toBe(true);
    expect(after.fields.get(2)).toBe('wet');
    expect(after.order[0]).toBe(0);
    expect(after.order[2]).toBe(1);
    expect(after.order[4]).toBe(2);
    expect(after.entry[4]).toBe(3); // came in from the west
  });

  it('water spills from an open end facing nothing', () => {
    // The tee's third arm points north, off the board.
    const tee = parseBoard('tee', ['s20 pE2 f80', '### ### ###']);
    const f = flow(tee, tee.start);
    expect(f.fields.get(2)).toBe('wet');
    expect(f.leaks).toEqual([{ at: 1, dir: 0, water: RAIN_BIT }]);
    expect(f.solved).toBe(false);
  });

  it('water spills against a rock or a closed side', () => {
    const rockBoard = parseBoard('rock', ['s20 ###']);
    expect(flow(rockBoard, [0, 0]).leaks).toEqual([{ at: 0, dir: 1, water: RAIN_BIT }]);
    const closed = parseBoard('closed', ['s20 p50']);
    const f = flow(closed, [0, 0]);
    expect(f.leaks.map((l) => l.at)).toEqual([0]);
    expect(f.dry).toBe(1); // the straight never gets water
  });

  it('a channel left dry keeps the board unsolved, even with every field watered', () => {
    const spare = parseBoard('spare', ['s20 f80', 'p30 p90']);
    const f = flow(spare, solvedRot(spare));
    expect(f.fieldsWet).toBe(1);
    expect(f.leaks).toHaveLength(0);
    expect(f.dry).toBe(2);
    expect(f.solved).toBe(false);
  });

  it('a bridge carries two flows across without mixing them', () => {
    const b = HOW_BOARDS.bridge;
    const f = flow(b, solvedRot(b));
    expect(f.solved).toBe(true);
    const at = 4; // the bridge, in the middle
    expect(f.wet[at * 2]).toBe(RAIN_BIT);
    expect(f.wet[at * 2 + 1]).toBe(RAIN_BIT);
    expect(f.order[at * 2]).toBe(1);
    expect(f.order[at * 2 + 1]).toBe(1);
  });

  it('keeps paddy and lotus waters apart across a bridge, and calls a mix wrong', () => {
    const two = parseBoard('two', ['### s40 ###', 't20 +++ l80', '### f10 ###']);
    const ok = flow(two, solvedRot(two));
    expect(ok.solved).toBe(true);
    expect(ok.wet[4 * 2]).toBe(RAIN_BIT);
    expect(ok.wet[4 * 2 + 1]).toBe(TANK_BIT);
    // Join the two networks: the lotus pond gets rain too.
    const mixed = parseBoard('mixed', ['s20 pE0 l80', '### f10 ###', '### ### ###']);
    const m = parseBoard('m2', ['s20 pE0 l80', '### t10 ###']);
    expect(flow(mixed, solvedRot(mixed)).fields.get(2)).toBe('wrong');
    const mm = flow(m, solvedRot(m));
    expect(mm.mixed).toBeGreaterThan(0);
    expect(mm.solved).toBe(false);
  });

  it('a check-dam lets water through only towards its arrow', () => {
    const dam = HOW_BOARDS.dam;
    const right = flow(dam, solvedRot(dam));
    expect(right.solved).toBe(true);
    expect(right.blocked).toEqual([]);
    // Turned half way round: the same straight channel, but the water is held back.
    const rot = solvedRot(dam);
    rot[1] = 2;
    const wrong = flow(dam, rot);
    expect(wrong.blocked).toEqual([1]);
    expect(wrong.fields.get(5)).toBe('dry');
    expect(wrong.leaks).toHaveLength(0);
    expect(wrong.solved).toBe(false);
  });

  it('every How to play board starts unsolved and solves at its orientation', () => {
    for (const b of Object.values(HOW_BOARDS)) {
      expect(flow(b, b.start).solved).toBe(false);
      expect(flow(b, solvedRot(b)).solved).toBe(true);
      expect(solve(b).solutions).toHaveLength(1);
    }
  });
});

describe('solver', () => {
  it('finds both answers when there are two', () => {
    // Two springs, two paddies: each spring can water either neighbour.
    const twin = parseBoard('twin', ['s20 f80', 'f10 s10']);
    expect(bruteCount(twin)).toBe(2);
    expect(solve(twin, { limit: 10 }).solutions).toHaveLength(2);
    expect(solve(twin, { limit: 1 }).solutions).toHaveLength(1);
  });

  it('finds none when there is no answer', () => {
    const stuck = parseBoard('stuck', ['s20 p50', '### f10']);
    expect(solve(stuck).solutions).toHaveLength(0);
  });

  it('respects pinned tiles', () => {
    const twin = parseBoard('twin', ['s20 f80', 'f10 s10']);
    const pinned = new Map([[0, 1]]); // the first spring faces south
    const r = solve(twin, { limit: 10, pinned });
    expect(r.solutions).toHaveLength(1);
    expect(flow(twin, r.solutions[0]!).solved).toBe(true);
    expect(r.solutions[0]![0]).toBe(1);
  });

  it('agrees with trying every rotation, on small boards of every kind', () => {
    const r = random(7);
    const base: LevelSpec = {
      w: 3,
      h: 3,
      rocks: 0.25,
      fields: 2,
      deadEnds: 2,
      wind: 0.3,
      twoWaters: false,
      bridges: 0,
      dams: 0,
      fixed: 0,
      slack: null,
      settled: 0,
      attempts: 1,
      pinAmbiguity: false,
    };
    const tally = { boards: 0, none: 0, one: 0 };
    for (let k = 0; tally.boards < 30 && k < 2000; k++) {
      const extra: Partial<LevelSpec> = [
        { twoWaters: true },
        { dams: 1 },
        { w: 4, h: 3, rocks: 0.34 },
        { w: 3, h: 4, fixed: 1 },
      ][k % 4]!;
      const g = generate({ ...base, ...extra }, 500 + k, 'x');
      if (!g) continue;
      let level = g.level;
      if (k % 3) {
        // Swap a few tiles for other shapes: some boards get no answer, some keep one.
        const tiles = [...level.tiles];
        for (let m = 0; m < 2; m++) {
          const a = Math.floor(r() * tiles.length);
          if (tiles[a]!.kind === 'pipe' || tiles[a]!.kind === 'rock')
            tiles[a] = { kind: 'pipe', mask: [3, 5, 7, 1, 15][Math.floor(r() * 5)]!, fixed: false };
        }
        level = { ...level, tiles };
      }
      const turnables = level.tiles.filter((t) => period(t) > 1 && !isFixed(t)).length;
      if (turnables > 7) continue;
      const truth = bruteCount(level);
      expect({ k, answers: solve(level, { limit: 50 }).solutions.length }).toEqual({
        k,
        answers: truth,
      });
      tally.boards++;
      if (truth === 0) tally.none++;
      if (truth === 1) tally.one++;
    }
    expect(tally.boards).toBe(30);
    expect(tally.none).toBeGreaterThan(0);
    expect(tally.one).toBeGreaterThan(0);
  });
});

describe('generator', () => {
  const spec: LevelSpec = {
    w: 7,
    h: 8,
    rocks: 0.14,
    fields: 5,
    deadEnds: 2,
    wind: 0.5,
    twoWaters: true,
    bridges: 1,
    dams: 1,
    fixed: 1,
    slack: 0.4,
    settled: 0.1,
    attempts: 6,
    pinAmbiguity: true,
  };

  it('builds the same level from the same seed, and another from another seed', () => {
    const a = generate(spec, 99, 'x')!;
    const b = generate(spec, 99, 'x')!;
    const c = generate(spec, 100, 'x')!;
    expect(encodeLevel(a.level)).toBe(encodeLevel(b.level));
    expect(encodeLevel(a.level)).not.toBe(encodeLevel(c.level));
  });

  it('builds boards that start unsolved, are solved at their own orientation, and have one answer', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const g = generate(spec, seed * 977, 'x');
      if (!g) continue;
      const l = g.level;
      expect(flow(l, l.start).solved).toBe(false);
      expect(flow(l, solvedRot(l)).solved).toBe(true);
      expect(g.unique).toBe(true);
      expect(l.budget).toBeGreaterThanOrEqual(turnsToSolve(l) + 2);
      // Fixed tiles start the right way round.
      l.tiles.forEach((t, a) => {
        if (isFixed(t)) expect(l.start[a]).toBe(0);
      });
    }
  });

  it('meets the spec: bridges, dams, both waters', () => {
    const g = generate(spec, 4242, 'x')!;
    const kinds = (k: Tile['kind']) => g.level.tiles.filter((t) => t.kind === k).length;
    expect(kinds('bridge')).toBe(1);
    expect(kinds('dam')).toBe(1);
    const waters = new Set(
      g.level.tiles.flatMap((t) => (t.kind === 'source' || t.kind === 'field' ? [t.water] : [])),
    );
    expect(waters.size).toBe(2);
  });
});
