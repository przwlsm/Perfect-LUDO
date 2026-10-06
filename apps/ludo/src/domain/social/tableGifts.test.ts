import { getTableGift, parseTableGiftMessage, TABLE_GIFTS } from './tableGifts';

describe('table gifts', () => {
  it('every gift has a positive gem price and a unique id', () => {
    const ids = new Set(TABLE_GIFTS.map((g) => g.id));
    expect(ids.size).toBe(TABLE_GIFTS.length);
    for (const gift of TABLE_GIFTS) expect(gift.gems).toBeGreaterThan(0);
  });

  it('looks a gift up by id', () => {
    expect(getTableGift('rose').emoji).toBe('🌹');
  });

  it('accepts a well-formed message', () => {
    expect(parseTableGiftMessage({ from: 0, to: 2, gift: 'rose' })).toEqual({
      from: 0,
      to: 2,
      gift: 'rose',
    });
  });

  it.each([
    ['nothing', null],
    ['a string', 'rose'],
    ['no gift', { from: 0, to: 1 }],
    ['an unknown gift', { from: 0, to: 1, gift: 'tank' }],
    ['a self-gift', { from: 1, to: 1, gift: 'rose' }],
    ['a seat out of range', { from: 0, to: 9, gift: 'rose' }],
    ['a fractional seat', { from: 0.5, to: 1, gift: 'rose' }],
  ])('drops %s', (_, payload) => {
    expect(parseTableGiftMessage(payload)).toBeNull();
  });
});
