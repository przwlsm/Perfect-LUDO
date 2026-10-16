import { ALL_PRIZES } from '@/domain/entities/Prize';
import { isValidTicket, ticketNumbers } from '@/domain/entities/Ticket';
import {
  ALPHABET,
  cleanCode,
  decodeRoom,
  encodeRoom,
  findRoomInText,
  formatTicketId,
  parseTicketId,
  randomStripCode,
  SEED_COUNT,
  stripFor,
  ticketFor,
} from './room';
import { random } from './seed';

describe('room codes', () => {
  it('round-trips seed and prizes through six safe characters', () => {
    const rng = random(9);
    for (let i = 0; i < 2000; i++) {
      const seed = Math.floor(rng() * SEED_COUNT);
      const prizes = ALL_PRIZES.filter(() => rng() < 0.6);
      const room = encodeRoom(seed, prizes);
      expect(room.code).toHaveLength(6);
      expect([...room.code].every((c) => ALPHABET.includes(c))).toBe(true);
      const back = decodeRoom(room.code);
      expect(back).toEqual(room);
      expect(back?.prizes).toContain('full');
    }
  });

  it('never uses look-alike characters', () => {
    for (const c of '01OIL') expect(ALPHABET.includes(c)).toBe(false);
    expect(new Set(ALPHABET).size).toBe(ALPHABET.length);
  });

  it('accepts lower case, spaces and dashes', () => {
    const room = encodeRoom(4242, ALL_PRIZES);
    const typed = `${room.code.slice(0, 3).toLowerCase()} - ${room.code.slice(3)}`;
    expect(decodeRoom(typed)?.code).toBe(room.code);
    expect(cleanCode(' ab-c d ')).toBe('ABCD');
  });

  it('catches most single-character typos', () => {
    const rng = random(3);
    let caught = 0;
    let tried = 0;
    for (let i = 0; i < 300; i++) {
      const { code } = encodeRoom(Math.floor(rng() * SEED_COUNT), ALL_PRIZES);
      const pos = Math.floor(rng() * 6);
      const other = ALPHABET[(ALPHABET.indexOf(code[pos]!) + 1 + Math.floor(rng() * 29)) % 31]!;
      const typo = code.slice(0, pos) + other + code.slice(pos + 1);
      tried++;
      if (decodeRoom(typo) === null) caught++;
    }
    expect(caught / tried).toBeGreaterThan(0.85);
  });

  it('rejects junk', () => {
    expect(decodeRoom('')).toBeNull();
    expect(decodeRoom('ABC')).toBeNull();
    expect(decodeRoom('ABCDEFG')).toBeNull();
    expect(decodeRoom('O0O0O0')).toBeNull();
  });

  it('finds a code inside a forwarded invite', () => {
    const room = encodeRoom(777, ['early5', 'full']);
    const text = `Join my Tambola game! Room code: ${room.code}\ntambola://join/${room.code}`;
    expect(findRoomInText(text)?.code).toBe(room.code);
    expect(findRoomInText('nothing to see here')).toBeNull();
  });

  it('reduces any seed into range', () => {
    const room = encodeRoom(SEED_COUNT + 5, ALL_PRIZES);
    expect(room.seed).toBe(5);
  });
});

describe('ticket ids', () => {
  it('formats and parses', () => {
    expect(formatTicketId({ strip: 'H7KQ', slot: 3 })).toBe('H7KQ-3');
    expect(parseTicketId('h7kq-3')).toEqual({ strip: 'H7KQ', slot: 3 });
    expect(parseTicketId('H7KQ 3')).toEqual({ strip: 'H7KQ', slot: 3 });
    expect(parseTicketId('H7KQ7')).toBeNull();
    expect(parseTicketId('H7KQ0')).toBeNull();
    expect(parseTicketId('H0KQ1')).toBeNull();
    expect(parseTicketId('H7K3')).toBeNull();
  });

  it('rebuilds the same ticket on any phone from room code and ID', () => {
    const { code } = encodeRoom(123456, ALL_PRIZES);
    const strip = randomStripCode(random(5));
    const mine = stripFor(code, strip);
    for (let slot = 1; slot <= 6; slot++) {
      const hosts = ticketFor(code.toLowerCase(), { strip, slot });
      expect(hosts).toEqual(mine[slot - 1]);
      expect(isValidTicket(hosts)).toBe(true);
    }
    expect(new Set(mine.flatMap(ticketNumbers)).size).toBe(90);
  });

  it('gives different rooms different tickets for the same ID', () => {
    const a = encodeRoom(1, ALL_PRIZES).code;
    const b = encodeRoom(2, ALL_PRIZES).code;
    expect(ticketFor(a, { strip: 'ABCD', slot: 1 })).not.toEqual(
      ticketFor(b, { strip: 'ABCD', slot: 1 }),
    );
  });
});
