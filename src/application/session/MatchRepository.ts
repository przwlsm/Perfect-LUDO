import {
  createGame,
  isGameState,
  seatColors,
  type DieValue,
  type GameState,
  type IKeyValueStore,
} from '@/domain';
/** 'online' matches are held by the server; only the first two are saved here. */
export type MatchMode = 'ai' | 'local' | 'online';
export interface MatchOptions {
  mode: MatchMode;
  players: 2 | 3 | 4 | 5 | 6;
  difficulty: 'easy' | 'smart';
}
export interface SavedMatch {
  version: 1;
  id: string;
  options: MatchOptions;
  state: GameState;
  lastDie: DieValue | null;
}
export const MATCH_KEY = 'ludo.match.v1';
export function newMatch(options: MatchOptions): SavedMatch {
  const colors = seatColors(options.players);
  return {
    version: 1,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    options,
    state: createGame(colors),
    lastDie: null,
  };
}
export function parseMatch(raw: string): SavedMatch {
  const m = JSON.parse(raw) as SavedMatch;
  if (
    m.version !== 1 ||
    typeof m.id !== 'string' ||
    !m.options ||
    // An online match lives on the server and is never saved here, so a local
    // file claiming to be one is not something this can restore.
    !['ai', 'local'].includes(m.options.mode) ||
    ![2, 3, 4, 5, 6].includes(m.options.players) ||
    !['easy', 'smart'].includes(m.options.difficulty) ||
    ![null, 1, 2, 3, 4, 5, 6].includes(m.lastDie) ||
    !isGameState(m.state, m.options.players)
  ) {
    throw new Error('The saved match could not be restored. Start a new game from the lobby.');
  }
  return m;
}
export interface IMatchRepository {
  load(): Promise<SavedMatch | null>;
  save(match: SavedMatch): Promise<void>;
}
export class MatchRepository implements IMatchRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: IKeyValueStore) {}
  async load(): Promise<SavedMatch | null> {
    await this.queue;
    const raw = await this.storage.getItem(MATCH_KEY);
    return raw ? parseMatch(raw) : null;
  }
  save(match: SavedMatch): Promise<void> {
    const result = this.queue.then(() => this.storage.setItem(MATCH_KEY, JSON.stringify(match)));
    this.queue = result.catch(() => undefined);
    return result;
  }
}
