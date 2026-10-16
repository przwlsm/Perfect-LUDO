import type { Cell, GameState, Move, Result, Side } from 'baghchal-engine';
import type {
  MatchOutcome,
  MatchPlayer,
  MatchStatus,
  OnlineMatchSnapshot,
  Profile,
} from '@/domain/entities/OnlineMatch';

/**
 * The server's JSON, checked field by field. A malformed answer throws
 * rather than reaching a screen as undefined.
 */

type Row = Record<string, unknown>;

function row(value: unknown, what: string): Row {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Bad ${what} from the server`);
  }
  return value as Row;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new Error(`Bad ${what} from the server`);
  return value;
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function integer(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`Bad ${what} from the server`);
  }
  return value;
}

function side(value: unknown, what: string): Side {
  if (value !== 'tiger' && value !== 'goat') throw new Error(`Bad ${what} from the server`);
  return value;
}

const STATUSES: readonly MatchStatus[] = ['WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED'];
const RULE_REASONS = ['captures', 'trapped', 'no-moves'] as const;
const DRAW_REASONS = ['repetition', 'no-progress'] as const;

function outcome(value: unknown): MatchOutcome | null {
  if (value === null || value === undefined) return null;
  const r = row(value, 'result');
  if (r.kind === 'draw') {
    const reason = r.reason;
    if (reason === DRAW_REASONS[0] || reason === DRAW_REASONS[1]) return { kind: 'draw', reason };
  } else if (r.kind === 'win') {
    const winner = side(r.winner, 'winner');
    const reason = r.reason;
    if (reason === 'captures' || reason === 'trapped' || reason === 'no-moves') {
      return { kind: 'win', winner, reason };
    }
    if (reason === 'timeout' || reason === 'resigned') return { kind: 'win', winner, reason };
  }
  throw new Error('Bad result from the server');
}

/** The rules' verdict only; the clock and resignations are not the board's business. */
function ruleResult(value: MatchOutcome | null): Result | null {
  if (!value) return null;
  if (value.kind === 'draw') return value;
  return (RULE_REASONS as readonly string[]).includes(value.reason) ? (value as Result) : null;
}

function move(value: unknown): Move | null {
  if (value === null || value === undefined) return null;
  const m = row(value, 'move');
  switch (m.kind) {
    case 'place':
      return { kind: 'place', to: integer(m.to, 'move') };
    case 'move':
      return { kind: 'move', from: integer(m.from, 'move'), to: integer(m.to, 'move') };
    case 'jump':
      return {
        kind: 'jump',
        from: integer(m.from, 'move'),
        over: integer(m.over, 'move'),
        to: integer(m.to, 'move'),
      };
    default:
      throw new Error('Bad move from the server');
  }
}

function gameState(value: unknown, verdict: Result | null): GameState {
  const s = row(value, 'state');
  if (!Array.isArray(s.board) || s.board.length !== 25)
    throw new Error('Bad board from the server');
  const board = s.board.map((cell): Cell => {
    if (cell !== 'T' && cell !== 'G' && cell !== '.') throw new Error('Bad board from the server');
    return cell;
  });
  const quiet = Array.isArray(s.quietPositions) ? s.quietPositions : [];
  return {
    board,
    turn: side(s.turn, 'turn'),
    goatsInHand: integer(s.goatsInHand, 'goats in hand'),
    goatsCaptured: integer(s.goatsCaptured, 'captures'),
    plies: integer(s.plies, 'plies'),
    quietPositions: quiet.map((key) => text(key, 'position')),
    result: verdict,
  };
}

function player(value: unknown): MatchPlayer | null {
  if (value === null || value === undefined) return null;
  const p = row(value, 'player');
  return {
    id: text(p.id, 'player'),
    username: text(p.username, 'player'),
    displayName: textOrNull(p.displayName),
  };
}

export function parseMatchSnapshot(raw: unknown): OnlineMatchSnapshot {
  const snapshot = row(raw, 'match');
  const m = row(snapshot.match, 'match');
  const status = m.status;
  if (!STATUSES.includes(status as MatchStatus))
    throw new Error('Bad match status from the server');
  const ended = outcome(row(m.state, 'state').result);
  const players = row(snapshot.players, 'players');
  const mySide =
    snapshot.mySide === null || snapshot.mySide === undefined
      ? null
      : side(snapshot.mySide, 'side');
  return {
    serverNow: text(snapshot.serverNow, 'server time'),
    mySide,
    match: {
      id: text(m.id, 'match id'),
      code: text(m.code, 'code'),
      status: status as MatchStatus,
      hostId: text(m.hostId, 'host'),
      tigerId: textOrNull(m.tigerId),
      goatId: textOrNull(m.goatId),
      state: gameState(m.state, ruleResult(ended)),
      outcome: ended,
      version: integer(m.version, 'version'),
      turnSeconds: integer(m.turnSeconds, 'turn length'),
      turnDeadline: textOrNull(m.turnDeadline),
      lastMove: move(m.lastMove),
      myReward: typeof m.myReward === 'number' ? m.myReward : null,
      myRewardDoubled: m.myRewardDoubled === true,
    },
    players: { tiger: player(players.tiger), goat: player(players.goat) },
  };
}

export function parseProfile(raw: unknown): Profile {
  const p = row(raw, 'profile');
  return {
    id: text(p.id, 'profile'),
    username: text(p.username, 'profile'),
    displayName: textOrNull(p.displayName),
    ratingTiger: integer(p.ratingTiger, 'rating'),
    ratingGoat: integer(p.ratingGoat, 'rating'),
    coins: integer(p.coins, 'coins'),
  };
}
