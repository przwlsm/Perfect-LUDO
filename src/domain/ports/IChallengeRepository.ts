import type { LobbySnapshot, Unsubscribe } from '../entities/Social';

export interface CreatedChallenge {
  readonly challengeId: string;
  readonly lobbyId: string;
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
  getLobby(lobbyId: string): Promise<LobbySnapshot>;
  joinLobby(lobbyId: string): Promise<LobbySnapshot>;
  leaveLobby(lobbyId: string): Promise<void>;
  setReady(lobbyId: string, ready: boolean): Promise<LobbySnapshot>;
  /** Rejected until the server's own start time has passed. Idempotent. */
  startMatch(lobbyId: string): Promise<LobbySnapshot>;
  subscribeToLobby(lobbyId: string, onChange: () => void): Unsubscribe;
}
