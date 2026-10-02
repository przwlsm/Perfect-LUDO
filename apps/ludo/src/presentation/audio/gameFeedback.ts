import { getFinishProgress, type GameState } from '@/domain';
export type GameCue = 'roll' | 'enter' | 'step' | 'capture' | 'home' | 'win';
export interface GameFeedback {
  id: number;
  cue: GameCue;
  steps: number;
}
export function getGameCue(
  before: GameState,
  after: GameState,
): { cue: GameCue; steps: number } | null {
  if (before.lastRoll === null && after.lastRoll !== null) return { cue: 'roll', steps: 0 };
  const previous = new Map(before.players.flatMap((p) => p.pieces).map((p) => [p.id, p.progress]));
  const changed = after.players
    .flatMap((p) => p.pieces)
    .filter((p) => previous.get(p.id) !== p.progress);
  const moved = changed.find((p) => p.progress > (previous.get(p.id) ?? 0));
  if (!moved) return null;
  const from = previous.get(moved.id) ?? 0;
  const steps = from === 0 ? 1 : moved.progress - from;
  return {
    steps,
    cue:
      after.status === 'FINISHED'
        ? 'win'
        : changed.some((p) => p.progress === 0)
          ? 'capture'
          : moved.progress === getFinishProgress(after.players.length)
            ? 'home'
            : from === 0
              ? 'enter'
              : 'step',
  };
}
