import { BLUE, RED, WHITE, YELLOW, type Level } from '@/domain/entities/Board';
import { parseBoard } from '../levels/handmade';
import { arrangementOf, compile } from './grid';
import { solve } from './solver';
import { lampStates, solved, trace } from './trace';

const board = (...rows: string[]): Level => parseBoard('t', rows);
const run = (level: Level, withSolution = false) => {
  const g = compile(level, withSolution ? arrangementOf(level, level.solution) : undefined);
  const t = trace(g, true);
  return { g, t, solved: solved(g, t), lamps: lampStates(g, t) };
};
const lampAt = (level: Level, x: number, y: number) => y * level.w + x;

describe('tracing light', () => {
  it('runs straight from a flame into a lamp', () => {
    const l = board('F> .. .. dW');
    const { t, solved: ok } = run(l);
    expect(ok).toBe(true);
    expect(t.lamp[3]).toBe(WHITE);
    expect(t.order).toEqual([1, 2]);
  });

  it('turns at mirrors: / sends right-moving light up, \\ sends it down', () => {
    const up = board('.. dW', 'F> /f');
    expect(run(up).solved).toBe(true);
    const down = board('F> \\f', '.. dW');
    expect(run(down).solved).toBe(true);
  });

  it('turns every way round a / and a \\ mirror', () => {
    // '/': up -> right, left -> down, down -> left.
    expect(run(board('/f dW', 'F^ ..')).solved).toBe(true);
    expect(run(board('.. /f F<', '.. dW ..')).solved).toBe(true);
    expect(run(board('.. Fv', 'dW /f')).solved).toBe(true);
    // '\': up -> left, left -> up, down -> right.
    expect(run(board('dW \\f', '.. F^')).solved).toBe(true);
    expect(run(board('dW ..', '\\f F<')).solved).toBe(true);
    expect(run(board('Fv ..', '\\f dW')).solved).toBe(true);
    // And never straight on.
    expect(run(board('dW /f F<', '.. .. ..')).solved).toBe(false);
  });

  it('splits light to both sides at a prism', () => {
    const l = board('dW *f dW', '.. F^ ..');
    const { t, solved: ok } = run(l);
    expect(ok).toBe(true);
    expect(t.lamp[0]).toBe(WHITE);
    expect(t.lamp[2]).toBe(WHITE);
  });

  it('tints light with coloured glass, and a lamp wants exactly its colour', () => {
    expect(run(board('F> rf dR')).solved).toBe(true);
    expect(run(board('F> .. dR')).lamps.get(2)).toBe('wrong');
    expect(run(board('F> yf dR')).lamps.get(2)).toBe('wrong');
    // Glass recolours light that is already coloured.
    expect(run(board('F> rf bf dB')).solved).toBe(true);
  });

  it('mixes two colours meeting at a lamp', () => {
    const l = board('F> rf dO yf F<');
    expect(run(l).t.lamp[2]).toBe(RED | YELLOW);
    expect(run(l).solved).toBe(true);
    expect(run(board('F> bf dG yf F<')).solved).toBe(true);
    expect(run(board('F> rf dP bf F<')).solved).toBe(true);
    // White light spoils a mix.
    expect(run(board('F> rf dO .. F<')).lamps.get(2)).toBe('wrong');
    expect(run(board('F> bf dB')).t.lamp[2]).toBe(BLUE);
  });

  it('is stopped by walls, other flames and the edge', () => {
    expect(run(board('F> ## dW')).lamps.get(2)).toBe('dark');
    expect(run(board('F> F< dW')).lamps.get(2)).toBe('dark');
    const edge = run(board('F> ..'));
    expect(edge.t.segs.slice(-6, -2)).toEqual([1.5, 0.5, 2, 0.5]);
  });

  it('passes one-way glass only in the arrow direction', () => {
    expect(run(board('F> o> dW')).solved).toBe(true);
    expect(run(board('F> o< dW')).solved).toBe(false);
    expect(run(board('dW', 'o^', 'F^')).solved).toBe(true);
    expect(run(board('dW', 'ov', 'F^')).solved).toBe(false);
  });

  it('fails while a sleeping lamp is woken', () => {
    const l = board('F> zz', 'dW ..');
    expect(run(l).solved).toBe(false);
    expect(run(l).lamps.get(1)).toBe('wrong');
    expect(run(board('zz ..', 'F> dW')).solved).toBe(true);
  });

  it('ends when light circles a loop of mirrors', () => {
    const l = board(
      '.. .. .. .. ..',
      '.. /f .. \\f ..',
      'F> *f .. .. dW',
      '.. \\f .. /f ..',
      '.. .. .. .. ..',
    );
    const { t, solved: ok } = run(l);
    expect(ok).toBe(true);
    expect(t.segs.length / 6).toBeLessThan(5 * 5 * 4 * 4);
  });

  it('records when light first reaches each cell', () => {
    const l = board('F> .. \\f', '.. .. dW');
    const { t } = run(l);
    expect(t.reach[1]).toBe(1);
    expect(t.reach[2]).toBe(2);
    expect(t.reach[lampAt(l, 2, 1)]).toBe(3);
  });
});

describe('solver', () => {
  it('finds where a tray mirror must go', () => {
    const l = board('.. .. .. ..', '.. /t .. dW', '.. .. .. ..', '.. F^ .. ..');
    const r = solve(l, { maxSolutions: 5 });
    expect(r.complete).toBe(true);
    expect(r.solutions).toEqual([[{ at: lampAt(l, 1, 1), piece: { type: 'mirror', slant: 0 } }]]);
  });

  it('turns pivots, and reports every way it finds', () => {
    const l = board('.. .. .. ..', '.. /p .. dW', '.. .. .. ..', '.. F^ .. ..');
    expect(run(l).solved).toBe(false);
    const r = solve(l);
    expect(r.solutions[0]).toEqual([{ at: 5, piece: { type: 'mirror', slant: 0 } }]);
  });

  it('says so when there is no way', () => {
    const l = board('F> ## dW', '.. .. ..');
    const r = solve(l);
    expect(r.solutions).toHaveLength(0);
    expect(r.complete).toBe(true);
  });

  it('respects a budget', () => {
    const l = board(
      '.. .. .. .. .. .. ..',
      '.. /t .. .. \\t .. ..',
      '.. .. .. .. .. .. ..',
      '.. .. .. .. .. .. ..',
      '.. .. .. dW .. .. ..',
      'F> .. .. .. /t .. ..',
      '.. .. .. .. .. .. ..',
    );
    const r = solve(l, { budget: 2 });
    expect(r.complete).toBe(false);
    expect(r.nodes).toBe(2);
  });

  it('solves boards with prisms, glass and mixing', () => {
    const l = board(
      '.. .. .. .. .. .. ..',
      '.. /f .. dO .. \\f ..',
      '.. rt .. .. .. yt ..',
      '.. .. .. .. .. .. ..',
      '.. \\f .. *f .. /f ..',
      '.. .. .. .. .. .. ..',
      '.. .. .. F^ .. .. ..',
    );
    const r = solve(l, { maxSolutions: 50 });
    expect(r.complete).toBe(true);
    // Red on either side and yellow on the other, anywhere along each upright.
    expect(r.solutions.length).toBeGreaterThanOrEqual(2);
    for (const s of r.solutions) {
      const g = compile(l, arrangementOf(l, s));
      expect(solved(g, trace(g))).toBe(true);
    }
  });

  it('keeps pinned pieces where they are', () => {
    const l = board('.. .. .. ..', '.. /t .. dW', '.. .. .. ..', '.. F^ .. ..');
    const pinned = [{ at: 9, piece: { type: 'mirror', slant: 0 } as const }];
    expect(solve(l, { pinned }).solutions).toHaveLength(0);
  });

  it('never needs a piece where no light falls', () => {
    const l = board('F> .. .. .. dW', '.. .. .. .. ..', '.. .. /t .. ..');
    // The mirror is spare: the lamp is already lit, so the empty answer wins.
    const r = solve(l, { maxSolutions: 3 });
    expect(r.solutions).toEqual([[]]);
  });
});
