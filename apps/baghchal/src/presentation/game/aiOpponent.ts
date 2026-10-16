import { AI_LEVELS, type AiLevel, type Side } from 'baghchal-engine';

/** The computer playing one side of a local game. */
export interface AiOpponent {
  readonly side: Side;
  readonly level: AiLevel;
}

type Param = string | string[] | undefined;

/**
 * The opponent a game route was opened with (`?ai=tactician&aiSide=tiger`),
 * or null for pass-and-play. An unknown level means no opponent rather
 * than a crash: a stale link still opens a playable board.
 */
export function parseAiOpponent(level: Param, side: Param): AiOpponent | null {
  const chosen = single(level);
  if (!isLevel(chosen)) return null;
  return { level: chosen, side: single(side) === 'tiger' ? 'tiger' : 'goat' };
}

function single(param: Param): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

// Own keys only: `'constructor' in AI_LEVELS` is true through the prototype.
const LEVELS: readonly string[] = Object.keys(AI_LEVELS);

function isLevel(value: string | undefined): value is AiLevel {
  return value !== undefined && LEVELS.includes(value);
}
