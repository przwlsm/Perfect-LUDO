import { callOrder, calledSet, missedNumbers } from './calling';
import { announcement, englishWord, hindiWord, numberWord } from './voice';

describe('callOrder', () => {
  it('calls every number from 1 to 90 exactly once', () => {
    for (let seed = 0; seed < 200; seed++) {
      const order = callOrder(seed);
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
    }
  });

  it('is fixed by the seed', () => {
    expect(callOrder(99)).toEqual(callOrder(99));
    expect(callOrder(99)).not.toEqual(callOrder(100));
  });

  it('is well shuffled (no seed keeps the numbers in order)', () => {
    const order = callOrder(5);
    const inPlace = order.filter((n, i) => n === i + 1).length;
    expect(inPlace).toBeLessThan(10);
  });

  it('builds the called set', () => {
    const order = callOrder(1);
    expect(calledSet(order, 0).size).toBe(0);
    expect(calledSet(order, 3)).toEqual(new Set(order.slice(0, 3)));
    expect(calledSet(order, 500).size).toBe(90);
  });
});

describe('missedNumbers', () => {
  const order = [10, 20, 30, 40, 50, 60];
  it('flags numbers called before the furthest daub', () => {
    const missed = missedNumbers(order, new Set([10, 40]), [10, 20, 40, 60]);
    expect([...missed]).toEqual([20]);
  });
  it('flags nothing without daubs', () => {
    expect(missedNumbers(order, new Set(), [10, 20]).size).toBe(0);
  });
  it('ignores daubs that are not on the tickets', () => {
    expect(missedNumbers(order, new Set([60]), [10, 20]).size).toBe(0);
  });
});

describe('voice', () => {
  it('says numbers in English', () => {
    expect(englishWord(1)).toBe('one');
    expect(englishWord(13)).toBe('thirteen');
    expect(englishWord(40)).toBe('forty');
    expect(englishWord(88)).toBe('eighty-eight');
    expect(englishWord(90)).toBe('ninety');
  });

  it('has a Hindi word for every number', () => {
    for (let n = 1; n <= 90; n++) {
      expect(hindiWord(n)).toMatch(/[ऀ-ॿ]/);
    }
    expect(new Set(Array.from({ length: 90 }, (_, i) => hindiWord(i + 1))).size).toBe(90);
    expect(hindiWord(22)).toBe('बाईस');
    expect(numberWord(90, 'hi')).toBe('नब्बे');
  });

  it('announces like a housie caller', () => {
    expect(announcement(22, 'en')).toBe('Two and two, twenty-two.');
    expect(announcement(7, 'en')).toBe('Number seven.');
    expect(announcement(88, 'en', 'Two big doughnuts')).toBe(
      'Two big doughnuts. Eight and eight, eighty-eight.',
    );
    expect(announcement(22, 'hi')).toBe('दो दो, बाईस.');
  });
});
