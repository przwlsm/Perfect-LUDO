import type { Move, Side } from 'baghchal-engine';
import type { OnlineMatchSnapshot, Unsubscribe } from '../entities/OnlineMatch';

/**
 * A match on the server, which owns the rules, the turn and the clock. A
 * move carries the version it was based on, so a stale client is told to
 * catch up instead of overwriting somebody's move.
 */
export interface IOnlineMatchRepository {
  /** Opens a game as `side` and returns it with its invitation code. */
  create(side: Side, turnSeconds: number): Promise<OnlineMatchSnapshot>;
  join(code: string): Promise<OnlineMatchSnapshot>;
  get(matchId: string): Promise<OnlineMatchSnapshot>;
  submitMove(matchId: string, version: number, move: Move): Promise<OnlineMatchSnapshot>;
  /** Once the opponent's clock has run out, claims the game. */
  claimTimeout(matchId: string, version: number): Promise<OnlineMatchSnapshot>;
  resign(matchId: string): Promise<OnlineMatchSnapshot>;
  subscribe(
    matchId: string,
    onChange: () => void,
    onStatus?: (connected: boolean) => void,
  ): Unsubscribe;
}
