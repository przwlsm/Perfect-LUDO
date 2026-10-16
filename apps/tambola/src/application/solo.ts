import type { PrizeId } from '@/domain/entities/Prize';
import type { TicketGrid } from '@/domain/entities/Ticket';
import { callOrder, calledSet } from './calling';
import { checkClaim, firstCompletion } from './claims';
import { hashString, random, shuffled } from './seed';
import { generateStrip } from './tickets';

/**
 * Solo play against computer players. Everything here is pure and runs on
 * a game clock (milliseconds of play, which stops while paused), so a game
 * is fully determined by its seed and the player's taps.
 */
export type BotStyle = 'quick' | 'steady' | 'dreamy';

export interface Bot {
  readonly name: string;
  readonly style: BotStyle;
  readonly tickets: readonly TicketGrid[];
}

export interface SoloSetup {
  readonly seed: number;
  readonly order: readonly number[];
  readonly player: readonly TicketGrid[];
  readonly bots: readonly Bot[];
  readonly prizes: readonly PrizeId[];
  readonly intervalMs: number;
}

export interface SoloOptions {
  readonly tickets: number; // 1–4
  readonly rivals: number; // 3–5
  readonly prizes: readonly PrizeId[];
  readonly intervalMs: number;
}

/** Friendly names from around the world; a game picks a few. */
export const BOT_NAMES: readonly string[] = [
  'Aarav',
  'Meera',
  'Sofia',
  'Kenji',
  'Amara',
  'Lucas',
  'Fatima',
  'Diego',
  'Priya',
  'Oliver',
  'Zara',
  'Mateo',
  'Ananya',
  'Yusuf',
  'Chloe',
  'Ravi',
  'Leila',
  'Noah',
  'Ines',
  'Tariq',
  'Mei',
  'Kwame',
  'Elena',
  'Arjun',
  'Hana',
  'Rohan',
];

/** The pause before the first ball, so everyone is ready. */
export const LEAD_IN_MS = 1800;

/** How long after the completing call each style of player takes to shout. */
const REACTION: Record<BotStyle, readonly [number, number]> = {
  quick: [900, 2300],
  steady: [1700, 3800],
  dreamy: [2600, 5600],
};

export function createSolo(seed: number, options: SoloOptions): SoloSetup {
  const rng = random(hashString(`solo:${seed}`));
  const tickets = Math.min(4, Math.max(1, Math.round(options.tickets)));
  const rivals = Math.min(5, Math.max(3, Math.round(options.rivals)));
  const names = shuffled(BOT_NAMES, rng).slice(0, rivals);
  const styles: BotStyle[] = ['quick', 'steady', 'dreamy'];
  const bots = names.map((name, i) => ({
    name,
    // Every game has one sharp player, so winning always means something.
    style: i === 0 ? 'quick' : styles[Math.floor(rng() * styles.length)]!,
    tickets: generateStrip(hashString(`bot:${seed}:${i}`)).slice(0, 1 + Math.floor(rng() * 3)),
  }));
  return {
    seed,
    order: callOrder(seed),
    player: generateStrip(hashString(`you:${seed}`)).slice(0, tickets),
    bots: shuffled(bots, rng),
    prizes: options.prizes,
    intervalMs: Math.max(1000, options.intervalMs),
  };
}

/** The game-clock time at which call number `index` (0-based) is made. */
export function callTime(setup: SoloSetup, index: number): number {
  return LEAD_IN_MS + index * setup.intervalMs;
}

export interface BotClaim {
  readonly prize: PrizeId;
  readonly bot: number;
  /** Game-clock ms at which the bot shouts. */
  readonly at: number;
}

/**
 * When each computer player would claim each prize: the call that
 * completes it on any of their tickets, plus their reaction time. Dreamy
 * players sometimes miss a number until the next ball.
 */
export function planBotClaims(setup: SoloSetup): BotClaim[] {
  const rng = random(hashString(`plan:${setup.seed}`));
  const plan: BotClaim[] = [];
  setup.bots.forEach((bot, b) => {
    for (const prize of setup.prizes) {
      const k = firstCompletion(bot.tickets, prize, setup.order);
      const [lo, hi] = REACTION[bot.style];
      const delay = lo + rng() * (hi - lo);
      const missed = bot.style === 'dreamy' && rng() < 0.3 ? setup.intervalMs : 0;
      if (k >= 0) plan.push({ prize, bot: b, at: callTime(setup, k) + delay + missed });
    }
  });
  return plan.sort((a, b) => a.at - b.at);
}

export type Winner = { readonly kind: 'you' } | { readonly kind: 'bot'; readonly bot: number };

export interface SoloState {
  readonly clock: number;
  readonly called: number;
  readonly winners: Readonly<Partial<Record<PrizeId, Winner>>>;
  /** Prizes the player lost to a bogus claim. */
  readonly forfeited: readonly PrizeId[];
  readonly over: boolean;
}

export const SOLO_START: SoloState = {
  clock: 0,
  called: 0,
  winners: {},
  forfeited: [],
  over: false,
};

export type SoloEvent =
  | { readonly kind: 'call'; readonly number: number; readonly index: number }
  | { readonly kind: 'botWin'; readonly prize: PrizeId; readonly bot: number }
  | { readonly kind: 'over' };

function isOver(setup: SoloSetup, winners: SoloState['winners']): boolean {
  return winners.full !== undefined || setup.prizes.every((p) => winners[p] !== undefined);
}

/** Runs the game clock forward by `dt` ms: balls are called and computer players claim, in time order. */
export function advance(
  setup: SoloSetup,
  plan: readonly BotClaim[],
  state: SoloState,
  dt: number,
): { state: SoloState; events: SoloEvent[] } {
  if (state.over || dt <= 0) return { state, events: [] };
  const end = state.clock + dt;
  const events: SoloEvent[] = [];
  let called = state.called;
  const winners: Partial<Record<PrizeId, Winner>> = { ...state.winners };
  const claims = plan.filter((c) => c.at > state.clock && c.at <= end);
  let ci = 0;
  for (;;) {
    const nextCall = called < setup.order.length ? callTime(setup, called) : Infinity;
    const nextClaim = claims[ci]?.at ?? Infinity;
    const at = Math.min(nextCall, nextClaim);
    if (at > end || at === Infinity) break;
    if (nextClaim <= nextCall) {
      const c = claims[ci++]!;
      if (winners[c.prize] === undefined) {
        winners[c.prize] = { kind: 'bot', bot: c.bot };
        events.push({ kind: 'botWin', prize: c.prize, bot: c.bot });
        if (isOver(setup, winners)) {
          events.push({ kind: 'over' });
          return { state: { ...state, clock: at, called, winners, over: true }, events };
        }
      }
    } else {
      events.push({ kind: 'call', number: setup.order[called]!, index: called });
      called++;
    }
  }
  return { state: { ...state, clock: end, called, winners }, events };
}

export type ClaimOutcome = 'won' | 'bogus' | 'taken' | 'forfeited';

/** The player shouts for a prize. Valid only if one of their tickets has every number it needs called. */
export function claimPrize(
  setup: SoloSetup,
  state: SoloState,
  prize: PrizeId,
): { state: SoloState; outcome: ClaimOutcome } {
  if (state.winners[prize]) return { state, outcome: 'taken' };
  if (state.forfeited.includes(prize)) return { state, outcome: 'forfeited' };
  const called = calledSet(setup.order, state.called);
  const valid = setup.player.some((g) => checkClaim(g, prize, called).valid);
  if (!valid) {
    return { state: { ...state, forfeited: [...state.forfeited, prize] }, outcome: 'bogus' };
  }
  const winners = { ...state.winners, [prize]: { kind: 'you' } as Winner };
  return { state: { ...state, winners, over: isOver(setup, winners) }, outcome: 'won' };
}

/** Prizes the player could claim right now (helps tests; the game never shows it). */
export function claimableNow(setup: SoloSetup, state: SoloState): PrizeId[] {
  const called = calledSet(setup.order, state.called);
  return setup.prizes.filter(
    (p) =>
      !state.winners[p] &&
      !state.forfeited.includes(p) &&
      setup.player.some((g) => checkClaim(g, p, called).valid),
  );
}
