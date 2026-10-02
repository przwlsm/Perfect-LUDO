import type { LobbyPlayer, PresenceStatus, PublicUser } from '../entities/Social';

/** How a player is addressed anywhere in the social UI. */
export function displayNameOf(user: Pick<PublicUser, 'displayName' | 'username'>): string {
  return user.displayName?.trim() || user.username || 'Player';
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0]!.slice(0, 2) : words[0]![0]! + words[1]![0]!;
  return letters.toUpperCase();
}

export function isOnline(presence: PresenceStatus): boolean {
  return presence !== 'OFFLINE';
}

/**
 * Re-applies the server's staleness rule on the client.
 *
 * The server computes presence when a row is read, but nothing is written
 * when somebody simply stops sending heartbeats — so no realtime event
 * arrives to say "they left". Re-deriving it locally on a timer is what stops
 * a crashed or backgrounded client from looking online indefinitely.
 */
export function agePresence(
  presence: PresenceStatus,
  lastSeen: string | null,
  nowMs: number,
  timeoutSeconds: number,
): PresenceStatus {
  if (presence === 'OFFLINE') return 'OFFLINE';
  const seen = lastSeen ? Date.parse(lastSeen) : NaN;
  if (!Number.isFinite(seen)) return 'OFFLINE';
  return nowMs - seen > timeoutSeconds * 1000 ? 'OFFLINE' : presence;
}

export function countOnline(users: readonly PublicUser[]): number {
  return users.reduce((total, user) => total + (isOnline(user.presence) ? 1 : 0), 0);
}

/** The creator always fills one seat, so they pick one fewer friend. */
export function requiredFriendCount(playerCount: number): number {
  return Math.max(0, playerCount - 1);
}

/** Selecting past the seat count is rejected rather than silently dropping the oldest pick. */
export function toggleSelection(
  selected: readonly string[],
  id: string,
  max: number,
): readonly string[] {
  if (selected.includes(id)) return selected.filter((value) => value !== id);
  return selected.length >= max ? selected : [...selected, id];
}

export function isLobbyPlayerPresent(player: LobbyPlayer): boolean {
  return player.status === 'JOINED' && isOnline(player.presence);
}

/** A player who joined but whose heartbeat has gone quiet. */
export function isLobbyPlayerDisconnected(player: LobbyPlayer): boolean {
  return player.status === 'JOINED' && !isOnline(player.presence);
}

export function countJoined(players: readonly LobbyPlayer[]): number {
  return players.reduce((total, player) => total + (player.status === 'JOINED' ? 1 : 0), 0);
}

/**
 * Difference between the server's clock and this device's, measured from a
 * single response. Every countdown is rendered through this so that players
 * on badly-set devices still see the game start at the same moment.
 */
export function serverClockOffsetMs(serverNow: string, receivedAtMs: number): number {
  const parsed = Date.parse(serverNow);
  return Number.isFinite(parsed) ? parsed - receivedAtMs : 0;
}

/** Whole seconds remaining until `targetIso`, never negative. */
export function secondsUntil(
  targetIso: string | null,
  clockOffsetMs: number,
  nowMs: number,
): number {
  if (!targetIso) return 0;
  const target = Date.parse(targetIso);
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - (nowMs + clockOffsetMs)) / 1000));
}
