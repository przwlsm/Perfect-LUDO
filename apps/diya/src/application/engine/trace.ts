import { DX, DY } from '@/domain/entities/Board';
import {
  DIYA,
  EMPTY,
  FLAME,
  GLASS,
  MIRROR_L,
  MIRROR_R,
  ONEWAY,
  PRISM,
  SLEEPER,
  WALL,
  type Grid,
} from './grid';

/** Where the light went. All positions are in cell units; a cell's centre is at +0.5. */
export interface Trace {
  /** Flat beam segments, six numbers each: x1, y1, x2, y2, hue, time. Empty unless asked for. */
  readonly segs: number[];
  /** Union of the hues that reached each lamp (diyas and sleepers); 0 elsewhere. */
  readonly lamp: Uint8Array;
  /** Hues that crossed each cell. */
  readonly hues: Uint8Array;
  /** Lamp arrivals in time order, three numbers each: cell, hue, time. */
  readonly arrivals: number[];
  /** Empty cells crossed by light, in the order light first reached them. */
  readonly order: number[];
  /** The step at which light first reached each cell in `order`. */
  readonly orderTime: number[];
  /** The step at which light first entered each cell (pieces and lamps too); -1 where it never did. */
  readonly reach: Int32Array;
}

// A mirror turns the beam: `/` swaps up<->right and down<->left; `\` swaps up<->left and down<->right.
const TURN_R = [1, 0, 3, 2];
const TURN_L = [3, 2, 1, 0];

/**
 * Follows every beam from every flame, breadth first, one cell per step.
 * Beams cross freely; a beam state (cell, direction, hue) is never walked
 * twice, so loops always end. Lamps, walls, flames and the board's edge
 * stop light; one-way glass stops it unless it travels the arrow's way.
 */
export function trace(g: Grid, withSegments = false): Trace {
  const { w, h, code, arg } = g;
  const n = w * h;
  const seen = new Uint8Array(n * 4);
  const lamp = new Uint8Array(n);
  const hues = new Uint8Array(n);
  const firstTime = new Int32Array(n).fill(-1);
  const reach = new Int32Array(n).fill(-1);
  const segs: number[] = [];
  const arrivals: number[] = [];
  const order: number[] = [];
  const orderTime: number[] = [];
  // Queue of beam states: the beam sits at cell `qc`, about to leave in `qd`.
  const qc: number[] = [];
  const qd: number[] = [];
  const qh: number[] = [];
  const qt: number[] = [];

  const push = (cell: number, dir: number, hue: number, time: number) => {
    const k = cell * 4 + dir;
    if ((seen[k]! & hue) !== 0) return;
    seen[k] = seen[k]! | hue;
    qc.push(cell);
    qd.push(dir);
    qh.push(hue);
    qt.push(time);
  };

  for (let cell = 0; cell < n; cell++) {
    if (code[cell] === FLAME) push(cell, arg[cell]! & 3, arg[cell]! >> 2, 0);
  }

  for (let head = 0; head < qc.length; head++) {
    const cell = qc[head]!;
    const dir = qd[head]!;
    const hue = qh[head]!;
    const time = qt[head]! + 1;
    const x = cell % w;
    const y = (cell - x) / w;
    const nx = x + DX[dir]!;
    const ny = y + DY[dir]!;
    const cx = x + 0.5;
    const cy = y + 0.5;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
      if (withSegments) segs.push(cx, cy, cx + DX[dir]! * 0.5, cy + DY[dir]! * 0.5, hue, time);
      continue;
    }
    const next = ny * w + nx;
    const c = code[next]!;
    const stops = c === WALL || c === FLAME || (c === ONEWAY && arg[next] !== dir);
    if (withSegments) {
      if (stops) segs.push(cx, cy, cx + DX[dir]! * 0.5, cy + DY[dir]! * 0.5, hue, time);
      else segs.push(cx, cy, nx + 0.5, ny + 0.5, hue, time);
    }
    if (stops) continue;
    if (reach[next] === -1) reach[next] = time;
    if (c === DIYA || c === SLEEPER) {
      lamp[next] = lamp[next]! | hue;
      arrivals.push(next, hue, time);
      continue;
    }
    hues[next] = hues[next]! | hue;
    if (c === EMPTY && firstTime[next] === -1) {
      firstTime[next] = time;
      order.push(next);
      orderTime.push(time);
    }
    switch (c) {
      case MIRROR_R:
        push(next, TURN_R[dir]!, hue, time);
        break;
      case MIRROR_L:
        push(next, TURN_L[dir]!, hue, time);
        break;
      case PRISM:
        push(next, (dir + 1) & 3, hue, time);
        push(next, (dir + 3) & 3, hue, time);
        break;
      case GLASS:
        push(next, dir, arg[next]!, time);
        break;
      default:
        // Empty floor and one-way glass travelled the right way.
        push(next, dir, hue, time);
    }
  }
  return { segs, lamp, hues, arrivals, order, orderTime, reach };
}

/** True when every diya has exactly its colour and every sleeping lamp is dark. */
export function solved(g: Grid, t: Trace): boolean {
  let lamps = 0;
  for (let i = 0; i < g.code.length; i++) {
    const c = g.code[i];
    if (c === DIYA) {
      lamps++;
      if (t.lamp[i] !== g.arg[i]) return false;
    } else if (c === SLEEPER && t.lamp[i] !== 0) return false;
  }
  return lamps > 0;
}

/** Each diya's state for the board: lit, dark, or wrong (light arrived, but not exactly its colour). */
export type LampState = 'lit' | 'dark' | 'wrong';

export function lampStates(g: Grid, t: Trace): Map<number, LampState> {
  const states = new Map<number, LampState>();
  for (let i = 0; i < g.code.length; i++) {
    const c = g.code[i];
    if (c === DIYA) {
      const got = t.lamp[i]!;
      states.set(i, got === g.arg[i] ? 'lit' : got === 0 ? 'dark' : 'wrong');
    } else if (c === SLEEPER) {
      states.set(i, t.lamp[i] === 0 ? 'dark' : 'wrong');
    }
  }
  return states;
}

/** Whether light of `mask` arriving at a lamp could still become exactly `need` with more light. */
export function couldBecome(mask: number, need: number): boolean {
  return (mask & ~need) === 0;
}
