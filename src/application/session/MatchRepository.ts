import {
  createGame,
  PLAYER_COLORS,
  type DieValue,
  type GameState,
  type IKeyValueStore,
  type Piece,
} from '@/domain';
export type MatchMode = 'ai' | 'local';
export interface MatchOptions {
  mode: MatchMode;
  players: 2 | 3 | 4;
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
  const colors =
    options.players === 2 ? (['RED', 'YELLOW'] as const) : PLAYER_COLORS.slice(0, options.players);
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
  const s = m.state;
  if (
    m.version !== 1 ||
    typeof m.id !== 'string' ||
    !m.options ||
    !['ai', 'local'].includes(m.options.mode) ||
    ![2, 3, 4].includes(m.options.players) ||
    !['easy', 'smart'].includes(m.options.difficulty) ||
    !s ||
    !Array.isArray(s.players) ||
    s.players.length !== m.options.players ||
    new Set(s.players.map((p) => p.color)).size !== s.players.length ||
    !Number.isInteger(s.currentPlayerIndex) ||
    s.currentPlayerIndex < 0 ||
    s.currentPlayerIndex >= s.players.length ||
    !Number.isInteger(s.consecutiveSixes) ||
    s.consecutiveSixes < 0 ||
    s.consecutiveSixes > 3 ||
    ![null, 1, 2, 3, 4, 5, 6].includes(s.lastRoll) ||
    ![null, 1, 2, 3, 4, 5, 6].includes(m.lastDie) ||
    !['IN_PROGRESS', 'FINISHED'].includes(s.status) ||
    !s.players.every(
      (p) =>
        PLAYER_COLORS.includes(p.color) &&
        p.id === p.color &&
        Array.isArray(p.pieces) &&
        p.pieces.length === 4 &&
        p.pieces.every(
          (piece: Piece, index: number) =>
            piece.id === `${p.color}-${index}` &&
            piece.color === p.color &&
            Number.isInteger(piece.progress) &&
            piece.progress >= 0 &&
            piece.progress <= 57,
        ),
    ) ||
    (s.status === 'IN_PROGRESS'
      ? s.winnerColor !== null
      : !s.players.some(
          (p) =>
            p.color === s.winnerColor && p.pieces.every((piece: Piece) => piece.progress === 57),
        ))
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
