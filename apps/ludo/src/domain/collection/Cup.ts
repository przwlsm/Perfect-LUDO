import { WalletUnavailableError } from '../entities/Wallet';

export type CupBracketStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED';

export interface CupEntry {
  readonly userId: string;
  readonly seat: number;
  readonly paid: number;
  readonly username: string | null;
  readonly displayName: string | null;
  readonly avatar: string | null;
  readonly country: string | null;
  readonly isBot: boolean;
}

export interface CupRound {
  /** 1 for the semi-finals, 2 for the final. */
  readonly round: number;
  readonly slot: number;
  readonly a: string;
  readonly b: string;
  /** The two-seat table for this round; null while two computer players decide it. */
  readonly lobbyId: string | null;
  readonly winner: string | null;
  readonly decidedAt: string | null;
  readonly matchStatus: 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED' | null;
}

/** One four-player knockout, as the server returns it. */
export interface CupBracket {
  readonly serverNow: string;
  readonly id: string;
  readonly cup: string;
  readonly status: CupBracketStatus;
  readonly hasBots: boolean;
  /** A cup with friends: joined by code, started by the host, no computer players. */
  readonly isPrivate: boolean;
  readonly host: string | null;
  readonly inviteCode: string | null;
  /** Everything paid in; a private cup's winner takes it all. */
  readonly pot: number;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  /** When computer players take the empty seats, while waiting. */
  readonly fillAt: string;
  readonly winner: string | null;
  readonly runnerUp: string | null;
  readonly prizePaid: boolean;
  readonly entries: readonly CupEntry[];
  readonly rounds: readonly CupRound[];
}

export interface CupHall {
  readonly id: string;
  readonly entry: number;
  readonly prize: number;
  readonly runnerUp: number;
  readonly variant: string;
  /** Players waiting in open brackets of this cup right now. */
  readonly waiting: number;
  /** Times the signed-in player has won this cup. */
  readonly won: number;
}

export interface CupsView {
  readonly serverNow: string;
  /** The bracket the player is in, if any. */
  readonly activeBracket: string | null;
  readonly botPaidToday: number;
  readonly botPrizeCap: number;
  readonly waitSeconds: number;
  readonly cups: readonly CupHall[];
}

const bad = () => new WalletUnavailableError('Received a malformed cup from the server.');
const row = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object') throw bad();
  return v as Record<string, unknown>;
};
const int = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
const optStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const STATUSES: readonly CupBracketStatus[] = ['WAITING', 'PLAYING', 'FINISHED', 'CANCELLED'];

export function parseCupBracket(v: unknown): CupBracket {
  const r = row(v);
  if (typeof r.id !== 'string' || typeof r.cup !== 'string') throw bad();
  const status = STATUSES.find((s) => s === r.status);
  if (!status) throw bad();
  return {
    serverNow: String(r.serverNow ?? ''),
    id: r.id,
    cup: r.cup,
    status,
    hasBots: r.hasBots === true,
    isPrivate: r.private === true,
    host: optStr(r.host),
    inviteCode: optStr(r.inviteCode),
    pot: int(r.pot),
    createdAt: String(r.createdAt ?? ''),
    startedAt: optStr(r.startedAt),
    finishedAt: optStr(r.finishedAt),
    fillAt: String(r.fillAt ?? ''),
    winner: optStr(r.winner),
    runnerUp: optStr(r.runnerUp),
    prizePaid: r.prizePaid === true,
    entries: Array.isArray(r.entries)
      ? r.entries.map(row).map((e) => ({
          userId: String(e.userId),
          seat: int(e.seat),
          paid: int(e.paid),
          username: optStr(e.username),
          displayName: optStr(e.displayName),
          avatar: optStr(e.avatar),
          country: optStr(e.country),
          isBot: e.isBot === true,
        }))
      : [],
    rounds: Array.isArray(r.rounds)
      ? r.rounds.map(row).map((x) => ({
          round: int(x.round),
          slot: int(x.slot),
          a: String(x.a),
          b: String(x.b),
          lobbyId: optStr(x.lobbyId),
          winner: optStr(x.winner),
          decidedAt: optStr(x.decidedAt),
          matchStatus:
            x.matchStatus === 'IN_PROGRESS' ||
            x.matchStatus === 'FINISHED' ||
            x.matchStatus === 'ABANDONED'
              ? x.matchStatus
              : null,
        }))
      : [],
  };
}

export function parseCupsView(v: unknown): CupsView {
  const r = row(v);
  return {
    serverNow: String(r.serverNow ?? ''),
    activeBracket: optStr(r.activeBracket),
    botPaidToday: int(r.botPaidToday),
    botPrizeCap: int(r.botPrizeCap),
    waitSeconds: int(r.waitSeconds),
    cups: Array.isArray(r.cups)
      ? r.cups.map(row).map((c) => ({
          id: String(c.id),
          entry: int(c.entry),
          prize: int(c.prize),
          runnerUp: int(c.runnerUp),
          variant: String(c.variant),
          waiting: int(c.waiting),
          won: int(c.won),
        }))
      : [],
  };
}

/** The name on a bracket chip: display name, handle, or nothing. */
export function cupEntryName(entry: CupEntry | undefined): string | null {
  return entry?.displayName || entry?.username || null;
}

/** How long a cup game takes: the server's average of recent real games. */
export interface CupGameLength {
  /** Average seconds per game; 0 when no game has been counted yet. */
  readonly seconds: number;
  /** How many finished games the average is taken over. */
  readonly samples: number;
}

/**
 * Our own estimate for a heads-up Quick 2 game (two coins home), used until
 * enough real games have been played for the server's average to mean much.
 */
export const QUICK2_ESTIMATE_SECONDS = 6 * 60;
/** Fewer real games than this and the estimate is shown instead. */
export const MIN_LENGTH_SAMPLES = 10;

export function parseCupGameLength(v: unknown): CupGameLength {
  const r = row(v);
  return { seconds: Math.max(0, int(r.seconds)), samples: Math.max(0, int(r.samples)) };
}

/**
 * Whole minutes for one cup game, never under one: the server's average
 * when it rests on enough games, otherwise the estimate. A whole cup is two
 * games back to back (the semi-finals run side by side), so it takes twice this.
 */
export function cupGameMinutes(length: CupGameLength | null): {
  readonly game: number;
  readonly cup: number;
  readonly measured: boolean;
} {
  const measured = !!length && length.samples >= MIN_LENGTH_SAMPLES && length.seconds > 0;
  const seconds = measured ? length.seconds : QUICK2_ESTIMATE_SECONDS;
  const game = Math.max(1, Math.round(seconds / 60));
  return { game, cup: game * 2, measured };
}
