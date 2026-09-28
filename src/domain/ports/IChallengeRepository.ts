import type { LobbySnapshot, Unsubscribe } from '../entities/Social';

export interface CreatedChallenge {
  readonly challengeId: string;
  readonly lobbyId: string;
}

/** A private table opened for sharing: where it is, and the code that gets you in. */
export interface LinkRoom {
  readonly lobbyId: string;
  readonly code: string;
}

/**
 * Private challenges and the lobby they open.
 *
 * State transitions are the server's to make: `startMatch` asks whether the
 * countdown has elapsed rather than announcing that it has, so a client
 * cannot bring a game forward for everyone else.
 */
export interface IChallengeRepository {
  /** `friendIds` fills every seat but the creator's: one for 2P, two for 3P. */
  createChallenge(friendIds: readonly string[]): Promise<CreatedChallenge>;
  /** Accepting returns the lobby to enter; declining returns null. */
  respondToChallenge(challengeId: string, accept: boolean): Promise<string | null>;
  cancelChallenge(challengeId: string): Promise<void>;
  /** Opens a 2-4 seat table joined by code; replaces this host's previous one. */
  createLinkRoom(playerCount: number, stake?: number): Promise<LinkRoom>;
  /** Takes the next free seat at the table for `code`; returns its lobby id. */
  joinLinkRoom(code: string): Promise<string>;
  getLobby(lobbyId: string): Promise<LobbySnapshot>;
  joinLobby(lobbyId: string): Promise<LobbySnapshot>;
  leaveLobby(lobbyId: string): Promise<void>;
  setReady(lobbyId: string, ready: boolean): Promise<LobbySnapshot>;
  /** Rejected until the server's own start time has passed. Idempotent. */
  startMatch(lobbyId: string): Promise<LobbySnapshot>;
  subscribeToLobby(lobbyId: string, onChange: () => void): Unsubscribe;
}
