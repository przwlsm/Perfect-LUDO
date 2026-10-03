import type { Move, Side } from 'baghchal-engine';
import type { MatchOutcome } from '@/domain/entities/OnlineMatch';
import type { SoundCue } from '@/domain/ports/ISoundPlayer';

export interface MoveFeedback {
  readonly sound: SoundCue;
  readonly haptic: 'drop' | 'capture';
}

/** What a move should sound and feel like. */
export function moveFeedback(move: Move): MoveFeedback {
  switch (move.kind) {
    case 'place':
      return { sound: 'place', haptic: 'drop' };
    case 'move':
      return { sound: 'move', haptic: 'drop' };
    case 'jump':
      return { sound: 'capture', haptic: 'capture' };
  }
}

/**
 * The sound for how the game ended, from the player's seat: `human` is the
 * side the person plays against the computer, or null when two people play
 * and any win is a win. A draw is silent.
 */
export function resultSound(result: MatchOutcome, human: Side | null): SoundCue | null {
  if (result.kind === 'draw') return null;
  if (human === null || result.winner === human) return 'win';
  return 'lose';
}
