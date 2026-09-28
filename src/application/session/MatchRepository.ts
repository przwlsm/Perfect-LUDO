import {
  ALL_PLAYER_COLORS,
  createGame,
  isGameState,
  seatColors,
  type DieValue,
  type GameState,
  type IKeyValueStore,
  type PlayerColor,
} from '@/domain';
/** 'online' matches are held by the server; only the first two are saved here. */
export type MatchMode = 'ai' | 'local' | 'online';
export type SeatNames = Partial<Record<PlayerColor, string>>;
export interface MatchOptions {
  mode: MatchMode;
  players: 2 | 3 | 4 | 5 | 6;
  difficulty: 'easy' | 'smart';
  /** Pass & play only: what to call each seat. Missing seats use their colour. */
  names?: SeatNames;
  /** 2 v 2: four seats only, opposite seats are partners. */
  teams?: boolean;
}

export const SEAT_NAME_MAX = 14;

/**
 * Keeps only real names for real seats: trimmed, control characters removed,
 * at most SEAT_NAME_MAX characters, empty ones dropped. Accepts anything
 * (route params, an old save) and never throws, so a bad value costs a name,
 * not the game.
 */
export function cleanSeatNames(raw: unknown, players: number): SeatNames {
  if (!raw || typeof raw !== 'object') return {};
  const seats = new Set<string>(seatColors(players));
  const names: SeatNames = {};
  for (const color of ALL_PLAYER_COLORS) {
    const value = (raw as Record<string, unknown>)[color];
    if (!seats.has(color) || typeof value !== 'string') continue;
    const name = value
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, SEAT_NAME_MAX);
    if (name) names[color] = name;
  }
  return names;
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
    state: createGame(colors, { teams: options.teams === true && options.players === 4 }),
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
    (m.options.teams !== undefined &&
      (typeof m.options.teams !== 'boolean' || (m.options.teams && m.options.players !== 4))) ||
    Boolean(m.options.teams) !== Boolean(m.state?.teams) ||
    !isGameState(m.state, m.options.players)
  ) {
    throw new Error('The saved match could not be restored. Start a new game from the lobby.');
  }
  // Names are cosmetic: a damaged one is dropped rather than failing the restore.
  const { names: savedNames, ...options } = m.options;
  const names = cleanSeatNames(savedNames, m.options.players);
  return { ...m, options: Object.keys(names).length ? { ...options, names } : options };
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
