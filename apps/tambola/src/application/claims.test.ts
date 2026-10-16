import { ALL_PRIZES } from '@/domain/entities/Prize';
import { rowNumbers, ticketNumbers, type TicketGrid } from '@/domain/entities/Ticket';
import { callOrder } from './calling';
import { checkClaim, completesAt, firstCompletion, prizeNumbers } from './claims';
import { generateTicket } from './tickets';

// A hand-made valid ticket, so the expectations are easy to read.
const T: TicketGrid = [
  [4, null, 23, null, 41, 52, null, 77, null],
  [null, 12, 25, 34, null, null, 66, null, 85],
  [9, 18, null, 39, null, 58, null, null, 90],
];

describe('prizeNumbers', () => {
  it('knows each prize', () => {
    expect(prizeNumbers(T, 'top').numbers).toEqual([4, 23, 41, 52, 77]);
    expect(prizeNumbers(T, 'middle').numbers).toEqual([12, 25, 34, 66, 85]);
    expect(prizeNumbers(T, 'bottom').numbers).toEqual([9, 18, 39, 58, 90]);
    expect(prizeNumbers(T, 'corners').numbers).toEqual([4, 77, 9, 90]);
    expect(prizeNumbers(T, 'full').numbers).toHaveLength(15);
    expect(prizeNumbers(T, 'early5')).toEqual({ numbers: ticketNumbers(T), needed: 5 });
  });
});

describe('checkClaim', () => {
  it('accepts a line when every number in it was called', () => {
    const r = checkClaim(T, 'top', new Set([4, 23, 41, 52, 77, 1, 2]));
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('calls a line bogus when one number is missing, and says which', () => {
    const r = checkClaim(T, 'top', new Set([4, 23, 41, 52]));
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual([77]);
    expect(r.short).toBe(1);
  });

  it('accepts Early Five with any five numbers', () => {
    expect(checkClaim(T, 'early5', new Set([4, 12, 39, 66, 90])).valid).toBe(true);
    const r = checkClaim(T, 'early5', new Set([4, 12, 39, 66, 1]));
    expect(r.valid).toBe(false);
    expect(r.short).toBe(1);
  });

  it('checks the four corners only', () => {
    expect(checkClaim(T, 'corners', new Set([4, 77, 9, 90])).valid).toBe(true);
    expect(checkClaim(T, 'corners', new Set([4, 77, 9, 58])).valid).toBe(false);
  });

  it('needs all fifteen for Full House', () => {
    const all = new Set(ticketNumbers(T));
    expect(checkClaim(T, 'full', all).valid).toBe(true);
    all.delete(66);
    const r = checkClaim(T, 'full', all);
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual([66]);
  });

  it('agrees with itself on generated tickets for every prize', () => {
    for (let seed = 0; seed < 100; seed++) {
      const t = generateTicket(seed);
      const order = callOrder(seed);
      for (const prize of ALL_PRIZES) {
        const at = completesAt(t, prize, order);
        expect(at).toBeGreaterThanOrEqual(0);
        expect(checkClaim(t, prize, new Set(order.slice(0, at + 1))).valid).toBe(true);
        expect(checkClaim(t, prize, new Set(order.slice(0, at))).valid).toBe(false);
      }
    }
  });
});

describe('completion', () => {
  it('finds the call that completes a row', () => {
    const order = [4, 23, 41, 99, 52, 77];
    expect(completesAt(T, 'top', order)).toBe(5);
    expect(completesAt(T, 'middle', order)).toBe(-1);
  });

  it('takes the best of several tickets', () => {
    const a = generateTicket(1);
    const b = generateTicket(2);
    const order = callOrder(3);
    expect(firstCompletion([a, b], 'top', order)).toBe(
      Math.min(completesAt(a, 'top', order), completesAt(b, 'top', order)),
    );
    expect(firstCompletion([], 'top', order)).toBe(-1);
    expect(rowNumbers(a, 0)).toHaveLength(5);
  });
});
