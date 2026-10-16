import { isPrizeId } from '@/domain/entities/Prize';
import type { HostSession, HostWin, PlayerSession } from '@/domain/entities/Session';
import { HIGHEST } from '@/domain/entities/Ticket';
import { decodeRoom, parseTicketId, STRIP_CODE_LENGTH, ALPHABET } from './room';
import { STRIP_SIZE } from './tickets';

/** Reads a stored host session, or null for anything missing or malformed. */
export function parseHostSession(raw: string | null): HostSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<HostSession>;
    if (typeof v.code !== 'string' || !decodeRoom(v.code)) return null;
    const called =
      typeof v.called === 'number' && Number.isInteger(v.called)
        ? Math.min(HIGHEST, Math.max(0, v.called))
        : 0;
    const wins: HostWin[] = Array.isArray(v.wins)
      ? v.wins.filter(
          (w): w is HostWin =>
            !!w &&
            isPrizeId(w.prize) &&
            typeof w.ticket === 'string' &&
            parseTicketId(w.ticket) !== null &&
            typeof w.name === 'string' &&
            typeof w.atCall === 'number',
        )
      : [];
    return {
      code: v.code,
      called,
      wins,
      startedAt: typeof v.startedAt === 'number' ? v.startedAt : 0,
    };
  } catch {
    return null;
  }
}

/** Reads a stored player session, or null for anything missing or malformed. */
export function parsePlayerSession(raw: string | null): PlayerSession | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<PlayerSession>;
    if (typeof v.code !== 'string' || !decodeRoom(v.code)) return null;
    if (
      typeof v.strip !== 'string' ||
      v.strip.length !== STRIP_CODE_LENGTH ||
      ![...v.strip].every((c) => ALPHABET.includes(c))
    ) {
      return null;
    }
    const count =
      typeof v.count === 'number' ? Math.min(STRIP_SIZE, Math.max(1, Math.round(v.count))) : 1;
    const daubs = Array.isArray(v.daubs)
      ? [
          ...new Set(
            v.daubs.filter(
              (n): n is number =>
                typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= HIGHEST,
            ),
          ),
        ]
      : [];
    return {
      code: v.code,
      strip: v.strip,
      count,
      daubs,
      joinedAt: typeof v.joinedAt === 'number' ? v.joinedAt : 0,
    };
  } catch {
    return null;
  }
}
