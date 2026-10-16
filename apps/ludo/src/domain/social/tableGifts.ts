/**
 * Table gifts: little animated tokens one online player sends at another
 * for gems, in the spirit of live-stream gifts. The server charges the gems
 * and records the gift; the gift then travels to every phone at the table
 * over the reaction channel, where each one plays the same animation.
 *
 * Prices live here AND in the `table_gifts` table (0031); the server's is
 * the one that charges, and a stale client is refused on a mismatch.
 */
export const TABLE_GIFTS = [
  { id: 'rose', emoji: '🌹', gems: 5, mood: 'love' },
  { id: 'punch', emoji: '🥊', gems: 5, mood: 'taunt' },
  { id: 'laugh', emoji: '🤣', gems: 3, mood: 'taunt' },
  { id: 'crown', emoji: '👑', gems: 15, mood: 'love' },
] as const;

export type TableGiftId = (typeof TABLE_GIFTS)[number]['id'];
export type TableGift = (typeof TABLE_GIFTS)[number];

export function isTableGiftId(value: unknown): value is TableGiftId {
  return typeof value === 'string' && TABLE_GIFTS.some((g) => g.id === value);
}

export function getTableGift(id: TableGiftId): TableGift {
  return TABLE_GIFTS.find((g) => g.id === id) as TableGift;
}

/** A device waits this long between two of its own gifts (also enforced server-side). */
export const TABLE_GIFT_COOLDOWN_MS = 4000;

/** One gift as it travels between players: from which seat, at which seat, what. */
export interface TableGiftMessage {
  readonly from: number;
  readonly to: number;
  readonly gift: TableGiftId;
}

function isSeat(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 7;
}

/** Validates a gift from the wire; null for anything malformed or self-sent. */
export function parseTableGiftMessage(payload: unknown): TableGiftMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const { from, to, gift } = payload as { from?: unknown; to?: unknown; gift?: unknown };
  if (!isSeat(from) || !isSeat(to) || from === to || !isTableGiftId(gift)) return null;
  return { from, to, gift };
}
