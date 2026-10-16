import { ALL_PRIZES, type PrizeId } from '@/domain/entities/Prize';
import { calledSet } from './calling';
import { checkClaim } from './claims';
import {
  advance,
  callTime,
  claimableNow,
  claimPrize,
  createSolo,
  planBotClaims,
  SOLO_START,
  type SoloState,
} from './solo';

const OPTIONS = { tickets: 2, rivals: 4, prizes: ALL_PRIZES, intervalMs: 4000 };

function runToEnd(seed: number) {
  const setup = createSolo(seed, OPTIONS);
  const plan = planBotClaims(setup);
  let state: SoloState = SOLO_START;
  const events = [];
  for (let i = 0; i < 2000 && !state.over; i++) {
    const step = advance(setup, plan, state, 250);
    state = step.state;
    events.push(...step.events.map((e) => ({ e, called: state.called })));
  }
  return { setup, plan, state, events };
}

describe('createSolo', () => {
  it('is deterministic and respects the options', () => {
    const a = createSolo(42, OPTIONS);
    expect(createSolo(42, OPTIONS)).toEqual(a);
    expect(a.player).toHaveLength(2);
    expect(a.bots).toHaveLength(4);
    expect(new Set(a.bots.map((b) => b.name)).size).toBe(4);
    for (const bot of a.bots) {
      expect(bot.tickets.length).toBeGreaterThanOrEqual(1);
      expect(bot.tickets.length).toBeLessThanOrEqual(3);
    }
  });

  it('clamps tickets and rivals', () => {
    const s = createSolo(1, { ...OPTIONS, tickets: 9, rivals: 1 });
    expect(s.player).toHaveLength(4);
    expect(s.bots).toHaveLength(3);
  });
});

describe('computer players', () => {
  it('only ever claim prizes they have really completed', () => {
    for (let seed = 0; seed < 60; seed++) {
      const setup = createSolo(seed, OPTIONS);
      for (const claim of planBotClaims(setup)) {
        // Numbers called by the time the bot shouts.
        let calls = 0;
        while (calls < 90 && callTime(setup, calls) <= claim.at) calls++;
        const called = calledSet(setup.order, calls);
        const bot = setup.bots[claim.bot]!;
        expect(bot.tickets.some((t) => checkClaim(t, claim.prize, called).valid)).toBe(true);
      }
    }
  });

  it('take a believable moment to react', () => {
    const setup = createSolo(7, OPTIONS);
    for (const claim of planBotClaims(setup)) {
      const sinceLastCall = (claim.at - callTime(setup, 0)) % setup.intervalMs;
      expect(claim.at).toBeGreaterThan(callTime(setup, 0) + 800);
      expect(sinceLastCall).toBeGreaterThanOrEqual(0);
    }
  });

  it('finish every game with a Full House winner', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { state } = runToEnd(seed);
      expect(state.over).toBe(true);
      expect(state.winners.full).toBeDefined();
    }
  });
});

describe('advance', () => {
  it('calls balls on the clock and never runs while stopped', () => {
    const setup = createSolo(3, OPTIONS);
    const plan = planBotClaims(setup);
    expect(advance(setup, plan, SOLO_START, 0).state).toBe(SOLO_START);
    const first = advance(setup, plan, SOLO_START, callTime(setup, 0));
    expect(first.state.called).toBe(1);
    expect(first.events[0]).toEqual({ kind: 'call', number: setup.order[0], index: 0 });
    const more = advance(setup, plan, first.state, setup.intervalMs * 2);
    expect(more.state.called).toBe(3);
  });

  it('is the same however the time is sliced', () => {
    const setup = createSolo(11, OPTIONS);
    const plan = planBotClaims(setup);
    let fine: SoloState = SOLO_START;
    for (let i = 0; i < 400; i++) fine = advance(setup, plan, fine, 100).state;
    const coarse = advance(setup, plan, SOLO_START, 40000).state;
    expect(coarse.called).toBe(fine.called);
    expect(coarse.winners).toEqual(fine.winners);
  });
});

describe('claimPrize', () => {
  it('wins a prize the player has completed', () => {
    const setup = createSolo(5, { ...OPTIONS, rivals: 3 });
    const plan: never[] = []; // no rivals shouting, so the player can't be beaten
    let state: SoloState = SOLO_START;
    let prize: PrizeId | undefined;
    while (!prize && state.called < 90) {
      state = advance(setup, plan, state, setup.intervalMs).state;
      prize = claimableNow(setup, state)[0];
    }
    expect(prize).toBeDefined();
    const r = claimPrize(setup, state, prize!);
    expect(r.outcome).toBe('won');
    expect(r.state.winners[prize!]).toEqual({ kind: 'you' });
    expect(claimPrize(setup, r.state, prize!).outcome).toBe('taken');
  });

  it('forfeits a prize on a bogus claim', () => {
    const setup = createSolo(5, OPTIONS);
    const r = claimPrize(setup, SOLO_START, 'full');
    expect(r.outcome).toBe('bogus');
    expect(r.state.forfeited).toEqual(['full']);
    expect(claimPrize(setup, r.state, 'full').outcome).toBe('forfeited');
  });

  it('ends the game when the player takes Full House', () => {
    const setup = createSolo(8, OPTIONS);
    let state: SoloState = { ...SOLO_START, called: 90 };
    const r = claimPrize(setup, state, 'full');
    expect(r.outcome).toBe('won');
    expect(r.state.over).toBe(true);
    state = r.state;
    expect(advance(setup, planBotClaims(setup), state, 1000).events).toEqual([]);
  });
});
