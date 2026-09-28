import { isGameState } from '@/domain';
import type {
  AppNotification,
  Challenge,
  GameState,
  OnlineMatchPlayer,
  OnlineMatchSnapshot,
  OnlineMatchStatus,
  ChallengeStatus,
  Friend,
  FriendRelationship,
  FriendRequest,
  InvitationStatus,
  Lobby,
  LobbyPlayer,
  LobbyPlayerStatus,
  LobbySnapshot,
  LobbyStatus,
  NotificationType,
  PresenceStatus,
  PublicUser,
  QuickMatchTicket,
  SocialIdentity,
  UsernameAvailability,
  UserSearchResult,
} from '@/domain';

/**
 * Rows are shaped by the database, not by us. Everything crossing this
 * boundary is checked before it becomes a domain object, so schema drift
 * fails loudly here instead of surfacing as an undefined username three
 * screens later.
 */

const MALFORMED = 'The server sent something this app could not read. Please try again.';

type Row = Record<string, unknown>;

function asRow(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(MALFORMED);
  return value as Row;
}

function str(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(MALFORMED);
  return value;
}

function optionalStr(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(MALFORMED);
  return value;
}

function int(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new Error(MALFORMED);
  return value;
}

function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error(MALFORMED);
  return value;
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(MALFORMED);
  return value as T;
}

const PRESENCE: readonly PresenceStatus[] = ['ONLINE', 'AWAY', 'IN_GAME', 'OFFLINE'];
const RELATIONSHIP: readonly FriendRelationship[] = [
  'SELF',
  'FRIEND',
  'REQUEST_SENT',
  'REQUEST_RECEIVED',
  'NONE',
];
const CHALLENGE_STATUS: readonly ChallengeStatus[] = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
  'IN_LOBBY',
  'STARTED',
  'COMPLETED',
];
const INVITATION_STATUS: readonly InvitationStatus[] = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
];
const LOBBY_STATUS: readonly LobbyStatus[] = [
  'WAITING',
  'COUNTDOWN',
  'STARTED',
  'CANCELLED',
  'COMPLETED',
];
const LOBBY_PLAYER_STATUS: readonly LobbyPlayerStatus[] = ['INVITED', 'JOINED', 'LEFT', 'DECLINED'];
const NOTIFICATION_TYPE: readonly NotificationType[] = [
  'FRIEND_REQUEST',
  'FRIEND_REQUEST_ACCEPTED',
  'CHALLENGE_INVITE',
  'CHALLENGE_ACCEPTED',
  'CHALLENGE_DECLINED',
  'CHALLENGE_EXPIRED',
  'CHALLENGE_CANCELLED',
  'GAME_STARTED',
];

function toPublicUser(row: Row, idKey = 'id'): PublicUser {
  return {
    id: str(row[idKey]),
    username: str(row.username),
    displayName: optionalStr(row.display_name),
    avatar: optionalStr(row.avatar),
    publicId: optionalStr(row.public_id),
    presence: oneOf(PRESENCE, row.presence),
    lastSeen: optionalStr(row.last_seen),
  };
}

export function toSearchResult(value: unknown): UserSearchResult {
  const row = asRow(value);
  return { ...toPublicUser(row), relationship: oneOf(RELATIONSHIP, row.relationship) };
}

export function toFriend(value: unknown): Friend {
  const row = asRow(value);
  return { ...toPublicUser(row), friendsSince: str(row.friends_since) };
}

export function toFriendRequest(value: unknown): FriendRequest {
  const row = asRow(value);
  return {
    id: str(row.id),
    user: toPublicUser(row, 'user_id'),
    createdAt: str(row.created_at),
  };
}

export function toNotification(value: unknown): AppNotification {
  const row = asRow(value);
  return {
    id: str(row.id),
    type: oneOf(NOTIFICATION_TYPE, row.type),
    title: str(row.title),
    message: str(row.message),
    challengeId: optionalStr(row.related_challenge_id),
    lobbyId: optionalStr(row.related_lobby_id),
    isRead: bool(row.is_read),
    createdAt: str(row.created_at),
  };
}

export function toIdentity(value: unknown): SocialIdentity {
  const row = asRow(value);
  return {
    id: str(row.id),
    username: str(row.username),
    displayName: optionalStr(row.displayName),
    avatar: optionalStr(row.avatar),
    publicId: optionalStr(row.publicId),
    isGuest: row.isGuest === true,
  };
}

export function toUsernameAvailability(value: unknown): UsernameAvailability {
  const row = asRow(value);
  return { available: bool(row.available), reason: optionalStr(row.reason) };
}

export function toQuickMatchTicket(value: unknown): QuickMatchTicket {
  const row = asRow(value);
  const status = oneOf(['WAITING', 'MATCHED'] as const, row.status);
  const lobbyId = optionalStr(row.lobbyId);
  if (status === 'MATCHED' && !lobbyId) throw new Error(MALFORMED);
  return {
    status,
    lobbyId,
    playerCount: int(row.playerCount),
    stake: row.stake == null ? 0 : int(row.stake),
    waiting: int(row.waiting),
    serverNow: str(row.serverNow),
  };
}

function toLobby(value: unknown): Lobby {
  const row = asRow(value);
  return {
    id: str(row.id),
    challengeId: str(row.challengeId),
    hostId: str(row.hostId),
    maxPlayers: int(row.maxPlayers),
    status: oneOf(LOBBY_STATUS, row.status),
    startAt: optionalStr(row.startAt),
    createdAt: str(row.createdAt),
    // Only LINK tables have one; older servers do not send the field.
    inviteCode: typeof row.inviteCode === 'string' ? row.inviteCode : null,
    // Servers before stakes send no field: those tables are free.
    stake: row.stake == null ? 0 : int(row.stake),
  };
}

function toChallenge(value: unknown): Challenge {
  const row = asRow(value);
  return {
    id: str(row.id),
    creatorId: str(row.creatorId),
    playerCount: int(row.playerCount),
    status: oneOf(CHALLENGE_STATUS, row.status),
    // Older servers omit the kind; every table they know about is a friend table.
    kind: row.kind === 'QUICK' ? 'QUICK' : row.kind === 'LINK' ? 'LINK' : 'FRIENDS',
    expiresAt: str(row.expiresAt),
    startedAt: optionalStr(row.startedAt),
  };
}

function toLobbyPlayer(value: unknown): LobbyPlayer {
  const row = asRow(value);
  return {
    userId: str(row.userId),
    username: str(row.username),
    displayName: optionalStr(row.displayName),
    avatar: optionalStr(row.avatar),
    seatIndex: int(row.seatIndex),
    status: oneOf(LOBBY_PLAYER_STATUS, row.status),
    isReady: bool(row.isReady),
    isHost: bool(row.isHost),
    joinedAt: optionalStr(row.joinedAt),
    invitationStatus:
      row.invitationStatus === null || row.invitationStatus === undefined
        ? null
        : oneOf(INVITATION_STATUS, row.invitationStatus),
    presence: oneOf(PRESENCE, row.presence),
    lastSeen: optionalStr(row.lastSeen),
  };
}

function optionalInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return int(value);
}

const MATCH_STATUS: readonly OnlineMatchStatus[] = ['IN_PROGRESS', 'FINISHED', 'ABANDONED'];

function toMatchPlayer(value: unknown): OnlineMatchPlayer {
  const row = asRow(value);
  return {
    userId: str(row.userId),
    seatIndex: int(row.seatIndex),
    username: str(row.username),
    displayName: optionalStr(row.displayName),
    avatar: optionalStr(row.avatar),
    presence: oneOf(PRESENCE, row.presence),
    lastSeen: optionalStr(row.lastSeen),
  };
}

export function toMatchSnapshot(value: unknown): OnlineMatchSnapshot {
  const row = asRow(value);
  const match = asRow(row.match);
  const playerCount = int(match.playerCount);
  if (playerCount < 2 || playerCount > 6) throw new Error(MALFORMED);
  const rawState = match.state;
  const empty = rawState === null || rawState === undefined;

  // A board from another player is no more trustworthy than one off disk, so
  // it goes through the same validation before the engine sees it.
  if (!empty && !isGameState(rawState, playerCount)) {
    throw new Error('Another player sent a board this app could not read.');
  }

  const lastRoll = optionalInt(match.lastRoll);
  if (lastRoll !== null && (lastRoll < 1 || lastRoll > 6)) throw new Error(MALFORMED);

  if (!Array.isArray(row.players) || row.players.length !== playerCount) throw new Error(MALFORMED);
  const seats = row.players.map(toMatchPlayer);
  if (
    new Set(seats.map((p) => p.seatIndex)).size !== playerCount ||
    seats.some((p) => p.seatIndex < 0 || p.seatIndex >= playerCount)
  )
    throw new Error(MALFORMED);
  if (int(match.turnSeat) < 0 || int(match.turnSeat) >= playerCount || int(match.version) < 0)
    throw new Error(MALFORMED);
  if (row.mySeat != null && (int(row.mySeat) < 0 || int(row.mySeat) >= playerCount))
    throw new Error(MALFORMED);
  if (
    !empty &&
    ((rawState as GameState).lastRoll !== null ||
      (rawState as GameState).currentPlayerIndex !== int(match.turnSeat))
  )
    throw new Error(MALFORMED);
  if (
    match.status === 'FINISHED' &&
    (empty ||
      (rawState as GameState).status !== 'FINISHED' ||
      match.winnerSeat == null ||
      int(match.winnerSeat) !== int(match.turnSeat))
  )
    throw new Error(MALFORMED);
  return {
    serverNow: str(row.serverNow),
    mySeat: optionalInt(row.mySeat),
    match: {
      id: str(match.id),
      lobbyId: str(match.lobbyId),
      playerCount,
      status: oneOf(MATCH_STATUS, match.status),
      state: empty ? null : (rawState as GameState),
      version: int(match.version),
      turnSeat: int(match.turnSeat),
      lastRoll: lastRoll as GameState['lastRoll'],
      winnerSeat: optionalInt(match.winnerSeat),
      stake: match.stake == null ? 0 : int(match.stake),
      pool: match.pool == null ? 0 : int(match.pool),
      prize: match.prize == null ? 0 : int(match.prize),
      turnDeadline: optionalStr(match.turnDeadline),
    },
    players: row.players.map(toMatchPlayer),
  };
}

export function toLobbySnapshot(value: unknown): LobbySnapshot {
  const row = asRow(value);
  if (!Array.isArray(row.players)) throw new Error(MALFORMED);
  return {
    serverNow: str(row.serverNow),
    lobby: toLobby(row.lobby),
    challenge: toChallenge(row.challenge),
    players: row.players.map(toLobbyPlayer),
  };
}

/**
 * Postgres raises with messages written for the player (`You can only
 * challenge your friends.`). Those are worth surfacing; connection-level
 * noise is not, so it is replaced with something actionable.
 */
export function toFriendlyError(error: { message?: string; code?: string } | null): Error {
  const message = error?.message?.trim();
  if (!message) return new Error('Something went wrong. Please try again.');
  // PGRST202: the app called a function the database does not have (or no
  // longer exposes). That is version skew between client and server, which a
  // player can only fix by updating — the raw "schema cache" text is useless
  // to them.
  if (error?.code === 'PGRST202' || /schema cache/i.test(message)) {
    return new Error('Your app and the game server are out of step. Please update the app.');
  }
  if (/JWT|not authenticated|permission denied for/i.test(message)) {
    return new Error('Please sign in again to continue.');
  }
  if (/fetch|network|timeout|abort/i.test(message)) {
    return new Error('Could not reach the server. Check your connection and try again.');
  }
  return new Error(message);
}
