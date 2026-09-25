/** Backend-independent vocabulary for friends, challenges and private lobbies. */

/** IN_GAME is a kind of present: only OFFLINE means absent. */
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'IN_GAME' | 'OFFLINE';

export type FriendRelationship = 'SELF' | 'FRIEND' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE';

export type ChallengeStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'IN_LOBBY'
  | 'STARTED'
  | 'COMPLETED';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

export type LobbyStatus = 'WAITING' | 'COUNTDOWN' | 'STARTED' | 'CANCELLED' | 'COMPLETED';

export type LobbyPlayerStatus = 'INVITED' | 'JOINED' | 'LEFT' | 'DECLINED';

export type NotificationType =
  | 'FRIEND_REQUEST'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'CHALLENGE_INVITE'
  | 'CHALLENGE_ACCEPTED'
  | 'CHALLENGE_DECLINED'
  | 'CHALLENGE_EXPIRED'
  | 'CHALLENGE_CANCELLED'
  | 'GAME_STARTED';

/**
 * Everything one player may see about another. Deliberately narrow: no email,
 * no coins, no match history. Widening this type means widening what the
 * server discloses, so it should stay a considered decision.
 */
export interface PublicUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatar: string | null;
  /** Eight-digit ID shown so friends can search for exactly this account. Guests have none. */
  readonly publicId: string | null;
  readonly presence: PresenceStatus;
  /** ISO timestamp of the last heartbeat, or null if they have never been seen. */
  readonly lastSeen: string | null;
}

export interface Friend extends PublicUser {
  readonly friendsSince: string;
}

export interface UserSearchResult extends PublicUser {
  readonly relationship: FriendRelationship;
}

export interface FriendRequest {
  readonly id: string;
  readonly user: PublicUser;
  readonly createdAt: string;
}

export interface LobbyPlayer {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string | null;
  readonly avatar: string | null;
  /** Fixed at invite time, so board seating never depends on join order. */
  readonly seatIndex: number;
  readonly status: LobbyPlayerStatus;
  readonly isReady: boolean;
  readonly isHost: boolean;
  readonly joinedAt: string | null;
  readonly invitationStatus: InvitationStatus | null;
  readonly presence: PresenceStatus;
  readonly lastSeen: string | null;
}

export interface Lobby {
  readonly id: string;
  readonly challengeId: string;
  readonly hostId: string;
  readonly maxPlayers: number;
  readonly status: LobbyStatus;
  /** Server-chosen instant the game begins; null until the countdown starts. */
  readonly startAt: string | null;
  readonly createdAt: string;
}

/** FRIENDS tables are invited; QUICK tables are seated from the public queue. */
export type ChallengeKind = 'FRIENDS' | 'QUICK';

export interface Challenge {
  readonly id: string;
  readonly creatorId: string;
  readonly playerCount: number;
  readonly status: ChallengeStatus;
  readonly kind: ChallengeKind;
  readonly expiresAt: string;
  readonly startedAt: string | null;
}

export interface LobbySnapshot {
  /** The server's clock at read time, used to correct for device clock skew. */
  readonly serverNow: string;
  readonly lobby: Lobby;
  readonly challenge: Challenge;
  readonly players: readonly LobbyPlayer[];
}

export interface AppNotification {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly challengeId: string | null;
  readonly lobbyId: string | null;
  readonly isRead: boolean;
  readonly createdAt: string;
}

export type Unsubscribe = () => void;
