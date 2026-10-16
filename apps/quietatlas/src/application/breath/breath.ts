/**
 * Breathing with a candle (hygge, Denmark): the flame rises as you breathe
 * in, rests while you hold, and settles as you breathe out.
 */
export type BreathPhase = 'in' | 'hold' | 'out' | 'rest';

export interface BreathPattern {
  readonly id: 'calm' | 'box' | 'sleep';
  /** Seconds for in, hold, out, rest. A zero phase is skipped. */
  readonly seconds: readonly [number, number, number, number];
}

export const PATTERNS: readonly BreathPattern[] = [
  { id: 'calm', seconds: [4, 0, 6, 0] },
  { id: 'box', seconds: [4, 4, 4, 4] },
  { id: 'sleep', seconds: [4, 7, 8, 0] },
];

const PHASES: readonly BreathPhase[] = ['in', 'hold', 'out', 'rest'];

export interface BreathMoment {
  readonly phase: BreathPhase;
  /** 0..1 through the current phase. */
  readonly progress: number;
  /** Seconds left in the current phase, rounded up, for the countdown. */
  readonly secondsLeft: number;
  /** Completed breaths. */
  readonly cycle: number;
  /** How full the lungs are, 0..1: the flame's height. */
  readonly fullness: number;
}

export function cycleSeconds(p: BreathPattern): number {
  return p.seconds.reduce((a, b) => a + b, 0);
}

export function breathAt(p: BreathPattern, elapsedMs: number): BreathMoment {
  const total = cycleSeconds(p);
  const t = Math.max(0, elapsedMs) / 1000;
  const cycle = Math.floor(t / total);
  let within = t - cycle * total;
  for (let i = 0; i < 4; i++) {
    const length = p.seconds[i]!;
    if (length === 0) continue;
    if (within < length || i === 3 || isLastNonZero(p, i)) {
      const phase = PHASES[i]!;
      const progress = Math.min(1, within / length);
      const eased = progress * progress * (3 - 2 * progress);
      const fullness =
        phase === 'in' ? eased : phase === 'hold' ? 1 : phase === 'out' ? 1 - eased : 0;
      return {
        phase,
        progress,
        secondsLeft: Math.max(1, Math.ceil(length - within)),
        cycle,
        fullness,
      };
    }
    within -= length;
  }
  // Unreachable for a pattern with any non-zero phase.
  return { phase: 'in', progress: 0, secondsLeft: 1, cycle, fullness: 0 };
}

function isLastNonZero(p: BreathPattern, i: number): boolean {
  for (let k = i + 1; k < 4; k++) if (p.seconds[k]! > 0) return false;
  return true;
}

/** Session lengths offered, in minutes. */
export const SESSION_MINUTES = [1, 3, 5] as const;
