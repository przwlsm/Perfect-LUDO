import { normalizePrizes, OPTIONAL_PRIZES, type PrizeId } from '@/domain/entities/Prize';
import type { TicketGrid } from '@/domain/entities/Ticket';
import { hashString } from './seed';
import { generateStrip, STRIP_SIZE } from './tickets';

/**
 * Party Room codes. No server: a six-character code carries everything
 * the game needs, so every phone at the party can work it out alone.
 *
 * The code packs the game's seed (which fixes the call order), the prizes
 * being played for, and a small check that catches most typos. Characters
 * that are easy to confuse when read aloud or handwritten (0/O, 1/I/L) are
 * never used.
 */
export const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const BASE = ALPHABET.length; // 31
export const CODE_LENGTH = 6;
const SPACE = BASE ** CODE_LENGTH; // 887 503 681
const PRIZE_BITS = 32; // one bit per optional prize
const CHECK_BITS = 16;
/** How many different games a code can describe (about 1.7 million). */
export const SEED_COUNT = Math.floor(SPACE / (PRIZE_BITS * CHECK_BITS));

export interface Room {
  readonly code: string;
  readonly seed: number;
  readonly prizes: readonly PrizeId[];
}

function check(seed: number, mask: number): number {
  return hashString(`tambola:${seed}:${mask}`) % CHECK_BITS;
}

function prizeMask(prizes: readonly PrizeId[]): number {
  return OPTIONAL_PRIZES.reduce((m, p, i) => (prizes.includes(p) ? m | (1 << i) : m), 0);
}

/** The code for a game. `seed` is reduced into range; Full House is always played. */
export function encodeRoom(seed: number, prizes: readonly PrizeId[]): Room {
  const s = Math.abs(Math.floor(seed)) % SEED_COUNT;
  const list = normalizePrizes(prizes);
  const mask = prizeMask(list);
  let value = (s * PRIZE_BITS + mask) * CHECK_BITS + check(s, mask);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code = ALPHABET[value % BASE]! + code;
    value = Math.floor(value / BASE);
  }
  return { code, seed: s, prizes: list };
}

/** Upper-cases and drops spaces, dashes and dots, however the code was typed or pasted. */
export function cleanCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s\-·_./]/g, '')
    .slice(0, 16);
}

/** The room a code describes, or null when it is not a real code (a typo, usually). */
export function decodeRoom(input: string): Room | null {
  const code = cleanCode(input);
  if (code.length !== CODE_LENGTH) return null;
  let value = 0;
  for (const ch of code) {
    const d = ALPHABET.indexOf(ch);
    if (d < 0) return null;
    value = value * BASE + d;
  }
  const c = value % CHECK_BITS;
  const rest = Math.floor(value / CHECK_BITS);
  const mask = rest % PRIZE_BITS;
  const seed = Math.floor(rest / PRIZE_BITS);
  if (seed >= SEED_COUNT || check(seed, mask) !== c) return null;
  const prizes = normalizePrizes(OPTIONAL_PRIZES.filter((_, i) => mask & (1 << i)));
  return { code, seed, prizes };
}

/** Finds a real room code inside pasted text, such as a forwarded invite message. */
export function findRoomInText(text: string): Room | null {
  const direct = decodeRoom(text);
  if (direct) return direct;
  const tokens = text.toUpperCase().match(/[0-9A-Z]{6}/g) ?? [];
  for (const token of tokens) {
    const room = decodeRoom(token);
    if (room) return room;
  }
  return null;
}

/**
 * Ticket IDs: four characters naming a strip of six, then the ticket's
 * place in it (1–6), shown as "H7KQ-3". A ticket is fixed by its room code
 * and ID, so the host's phone can rebuild any player's ticket to check a
 * claim, and tickets printed for someone without the app work too.
 */
export const STRIP_CODE_LENGTH = 4;

export interface TicketId {
  readonly strip: string;
  readonly slot: number; // 1–6
}

export function formatTicketId(id: TicketId): string {
  return `${id.strip}-${id.slot}`;
}

/** Reads what a person typed ("h7kq3", "H7KQ-3", "H7KQ 3"), or null. */
export function parseTicketId(input: string): TicketId | null {
  const clean = cleanCode(input);
  if (clean.length !== STRIP_CODE_LENGTH + 1) return null;
  const strip = clean.slice(0, STRIP_CODE_LENGTH);
  const slot = Number(clean.slice(STRIP_CODE_LENGTH));
  if (![...strip].every((ch) => ALPHABET.includes(ch))) return null;
  if (!Number.isInteger(slot) || slot < 1 || slot > STRIP_SIZE) return null;
  return { strip, slot };
}

/** A fresh random strip code from any random source. */
export function randomStripCode(rng: () => number): string {
  let s = '';
  for (let i = 0; i < STRIP_CODE_LENGTH; i++) s += ALPHABET[Math.floor(rng() * BASE)]!;
  return s;
}

/** The six tickets of a strip in a room. */
export function stripFor(roomCode: string, strip: string): TicketGrid[] {
  return generateStrip(hashString(`${cleanCode(roomCode)}:${strip}`));
}

/** One ticket, rebuilt from its room and ID. */
export function ticketFor(roomCode: string, id: TicketId): TicketGrid {
  return stripFor(roomCode, id.strip)[id.slot - 1]!;
}
