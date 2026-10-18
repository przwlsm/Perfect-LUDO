import type { CupBracket, CupGameLength, CupsView } from '../collection/Cup';

/** The Royal Road cups: the halls, and one bracket at a time per player. */
export interface ICupsRepository {
  list(): Promise<CupsView>;
  /** Pays the entry and sits down; returns the bracket (the open one, if already in one). */
  join(cupId: string): Promise<CupBracket>;
  /** Leaves a bracket that has not started, refunding the entry. */
  leave(bracketId: string): Promise<void>;
  /** Reads a bracket; reading is also what moves it along on the server. */
  get(bracketId: string): Promise<CupBracket>;
  /** Opens a cup with friends in a hall; the host pays and sits first. */
  createPrivate(cupId: string): Promise<CupBracket>;
  /** Sits down at a friend's cup by its six-letter code. */
  joinByCode(code: string): Promise<CupBracket>;
  /** The host starts a cup with friends once two to four are in. */
  startPrivate(bracketId: string): Promise<CupBracket>;
  /** The average length of a recent real cup game (heads-up Quick 2). */
  gameLength(): Promise<CupGameLength>;
}
