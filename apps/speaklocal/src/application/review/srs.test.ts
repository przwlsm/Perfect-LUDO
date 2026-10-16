import { afterAnswer, dueKeys, grade, MAX_INTERVAL, MIN_EASE, newCard } from './srs';

const T = 20000;

describe('SM-2-lite', () => {
  it('a new card is due today', () => {
    expect(newCard(T)).toEqual({ ease: 2.5, interval: 0, due: T, reps: 0, lapses: 0 });
  });

  it('good answers space out: 1, 3, then times the ease', () => {
    let c = newCard(T);
    c = grade(c, 'good', T);
    expect([c.interval, c.due]).toEqual([1, T + 1]);
    c = grade(c, 'good', T + 1);
    expect([c.interval, c.due]).toEqual([3, T + 4]);
    c = grade(c, 'good', T + 4);
    expect(c.interval).toBe(8); // round(3 × 2.5)
    c = grade(c, 'good', T + 12);
    expect(c.interval).toBe(20);
    expect(c.reps).toBe(4);
  });

  it('again brings it back today, counts a lapse and lowers the ease', () => {
    const learned = grade(grade(newCard(T), 'good', T), 'good', T + 1);
    const missed = grade(learned, 'again', T + 4);
    expect(missed).toMatchObject({ interval: 0, due: T + 4, reps: 0, lapses: 1, ease: 2.3 });
  });

  it('easy jumps ahead and raises the ease; hard grows gently and lowers it', () => {
    const easy = grade(newCard(T), 'easy', T);
    expect(easy.interval).toBe(3);
    expect(easy.ease).toBe(2.65);
    const base = { ease: 2.5, interval: 10, due: T, reps: 3, lapses: 0 };
    const hard = grade(base, 'hard', T);
    expect(hard.interval).toBe(12);
    expect(hard.ease).toBe(2.35);
  });

  it('ease never falls below the floor and intervals are capped', () => {
    let c = newCard(T);
    for (let i = 0; i < 20; i++) c = grade(c, 'again', T);
    expect(c.ease).toBe(MIN_EASE);
    const long = grade({ ease: 3, interval: 150, due: T, reps: 9, lapses: 0 }, 'easy', T);
    expect(long.interval).toBe(MAX_INTERVAL);
    expect(long.ease).toBe(3);
  });

  it('lists due cards, most overdue first', () => {
    const cards = {
      a: { ...newCard(T), due: T + 1 },
      b: { ...newCard(T), due: T - 3 },
      c: { ...newCard(T), due: T },
      d: { ...newCard(T), due: T - 3 },
    };
    expect(dueKeys(cards, T)).toEqual(['b', 'd', 'c']);
  });

  it('quiz answers feed review: misses join it, hits move due cards on', () => {
    let cards = afterAnswer({}, 'kn:auto.1', true, T);
    expect(cards).toEqual({});
    cards = afterAnswer(cards, 'kn:auto.1', false, T);
    expect(cards['kn:auto.1']).toMatchObject({ due: T, lapses: 1 });
    cards = afterAnswer(cards, 'kn:auto.1', true, T);
    expect(cards['kn:auto.1']).toMatchObject({ due: T + 1, reps: 1 });
    // Not due yet: a correct answer leaves the schedule alone.
    expect(afterAnswer(cards, 'kn:auto.1', true, T)).toBe(cards);
  });
});
