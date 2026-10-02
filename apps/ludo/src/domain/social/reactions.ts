import type { GameState } from '../entities/GameState';
import type { PlayerColor } from '../entities/PlayerColor';

/** The emoji a player can send at the table. Anything else is dropped on arrival. */
export const REACTIONS = ['😂', '😎', '🔥', '👏', '😡', '😭', '😱', '🙏'] as const;
export type Reaction = (typeof REACTIONS)[number];

/** How long a device waits between two of its own reactions. */
export const REACTION_COOLDOWN_MS = 1500;

export function isReaction(value: unknown): value is Reaction {
  return typeof value === 'string' && (REACTIONS as readonly string[]).includes(value);
}

/** One reaction as it travels between players: which seat sent which emoji. */
export interface ReactionMessage {
  readonly seat: number;
  readonly emoji: Reaction;
}

/** Validates a message from the wire; null for anything malformed. */
export function parseReactionMessage(payload: unknown): ReactionMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const { seat, emoji } = payload as { seat?: unknown; emoji?: unknown };
  if (typeof seat !== 'number' || !Number.isInteger(seat) || seat < 0 || seat > 5) return null;
  if (!isReaction(emoji)) return null;
  return { seat, emoji };
}

/** What just happened on the board, as far as a computer opponent cares. */
export type TableMoment =
  | { readonly kind: 'capture'; readonly by: PlayerColor; readonly victim: PlayerColor }
  | { readonly kind: 'six'; readonly by: PlayerColor }
  | { readonly kind: 'win'; readonly by: PlayerColor };

/** Reads the moment worth reacting to from one state change, if any. */
export function tableMoment(before: GameState, after: GameState): TableMoment | null {
  const mover = before.players[before.currentPlayerIndex]?.color;
  if (!mover) return null;
  if (before.status !== 'FINISHED' && after.status === 'FINISHED' && after.winnerColor)
    return { kind: 'win', by: after.winnerColor };
  const previous = new Map(before.players.flatMap((p) => p.pieces).map((p) => [p.id, p.progress]));
  for (const player of after.players) {
    if (player.color === mover) continue;
    const knocked = player.pieces.some((p) => p.progress === 0 && (previous.get(p.id) ?? 0) > 0);
    if (knocked) return { kind: 'capture', by: mover, victim: player.color };
  }
  if (before.lastRoll === null && after.lastRoll === 6) return { kind: 'six', by: mover };
  return null;
}

const pick = <T>(items: readonly T[], roll: number): T =>
  items[Math.min(items.length - 1, Math.floor(roll * items.length))] as T;

/**
 * Whether a computer seat reacts to a moment, and with what. `chance` and
 * `choice` are uniform numbers in [0, 1) so callers (and tests) control luck.
 */
export function botReaction(
  moment: TableMoment,
  isBot: (color: PlayerColor) => boolean,
  chance: number,
  choice: number,
): { readonly color: PlayerColor; readonly emoji: Reaction } | null {
  switch (moment.kind) {
    case 'capture':
      if (isBot(moment.victim) && chance < 0.6)
        return { color: moment.victim, emoji: pick(['😡', '😭', '😱'] as const, choice) };
      if (isBot(moment.by) && chance < 0.5)
        return { color: moment.by, emoji: pick(['😂', '😎', '🔥'] as const, choice) };
      return null;
    case 'six':
      return isBot(moment.by) && chance < 0.15 ? { color: moment.by, emoji: '🔥' } : null;
    case 'win':
      return isBot(moment.by) && chance < 0.8 ? { color: moment.by, emoji: '😎' } : null;
  }
}

/** A computer's answer to an emoji the player sent, e.g. a laugh for a laugh. */
export function botReply(sent: Reaction, chance: number, choice: number): Reaction | null {
  if (chance >= 0.4) return null;
  const replies: Record<Reaction, readonly Reaction[]> = {
    '😂': ['😂', '😎'],
    '😎': ['😂', '🔥'],
    '🔥': ['🔥', '😱'],
    '👏': ['🙏', '👏'],
    '😡': ['😂', '😎'],
    '😭': ['😂', '🙏'],
    '😱': ['😂', '😎'],
    '🙏': ['🙏', '👏'],
  };
  return pick(replies[sent], choice);
}
