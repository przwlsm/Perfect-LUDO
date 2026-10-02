import type { GameState } from '../entities/GameState';
import type { OnlineMatchSnapshot } from '../entities/OnlineMatch';
import type { Unsubscribe } from '../entities/Social';

/**
 * The shared board of a private online match.
 *
 * The server owns dice, turns and legal transitions. Rolling
 * asks for a value rather than announcing one, and submitting carries the
 * version it was based on so a stale client is told to catch up instead of
 * overwriting somebody's move.
 */
export interface IMatchSyncRepository {
  /** Clients arrive from the lobby, so the match is looked up by lobby id. */
  getMatchForLobby(lobbyId: string): Promise<OnlineMatchSnapshot>;
  /** Asks the server to roll. Rejected unless it is the caller's turn. */
  rollDice(matchId: string, version: number): Promise<OnlineMatchSnapshot>;
  /** Proposes a board; the server requires an exact legal successor of its stored roll. */
  submitTurn(
    matchId: string,
    version: number,
    state: GameState,
    winnerSeat: number | null,
  ): Promise<OnlineMatchSnapshot>;
  /**
   * Once the turn clock has run out, asks the server to play the idle seat's
   * turn. `version` is the board the caller saw, so the turn is played once.
   */
  claimTimeout(matchId: string, version: number): Promise<OnlineMatchSnapshot>;
  /** Ends the match for everyone; an escape hatch when somebody walks away. */
  abandon(matchId: string): Promise<OnlineMatchSnapshot>;
  subscribe(
    matchId: string,
    onChange: () => void,
    onStatus?: (connected: boolean) => void,
  ): Unsubscribe;
}
