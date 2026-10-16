import { ALL_PRIZES } from '@/domain/entities/Prize';
import { encodeRoom } from './room';
import { parseHostSession, parsePlayerSession } from './sessions';

const CODE = encodeRoom(31337, ALL_PRIZES).code;

describe('parseHostSession', () => {
  it('reads what was stored', () => {
    const s = {
      code: CODE,
      called: 12,
      wins: [{ prize: 'top', ticket: 'H7KQ-3', name: 'Asha', atCall: 11 }],
      startedAt: 5,
    };
    expect(parseHostSession(JSON.stringify(s))).toEqual(s);
  });

  it('drops anything malformed', () => {
    expect(parseHostSession(null)).toBeNull();
    expect(parseHostSession('{oops')).toBeNull();
    expect(parseHostSession(JSON.stringify({ code: 'NOPE00', called: 3 }))).toBeNull();
    const s = parseHostSession(
      JSON.stringify({ code: CODE, called: 400, wins: [{ prize: 'jackpot' }, null] }),
    );
    expect(s?.called).toBe(90);
    expect(s?.wins).toEqual([]);
  });
});

describe('parsePlayerSession', () => {
  it('reads what was stored and tidies daubs', () => {
    const s = parsePlayerSession(
      JSON.stringify({
        code: CODE,
        strip: 'H7KQ',
        count: 3,
        daubs: [5, 5, 91, 'x', 12],
        joinedAt: 1,
      }),
    );
    expect(s).toEqual({ code: CODE, strip: 'H7KQ', count: 3, daubs: [5, 12], joinedAt: 1 });
  });

  it('drops a bad strip or code and clamps the count', () => {
    expect(parsePlayerSession(JSON.stringify({ code: CODE, strip: 'H0KQ' }))).toBeNull();
    expect(parsePlayerSession(JSON.stringify({ code: 'ZZZZZZ', strip: 'H7KQ' }))).toBeNull();
    expect(
      parsePlayerSession(JSON.stringify({ code: CODE, strip: 'H7KQ', count: 12 }))?.count,
    ).toBe(6);
  });
});
