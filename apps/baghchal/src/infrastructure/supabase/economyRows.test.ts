import { parseStoreCatalog, parseWallet } from './economyRows';

const wallet = {
  coins: 130,
  supporter: false,
  equippedBoard: 'classic_wood',
  equippedPieces: 'brass_classic',
  owned: ['mahogany'],
  adRewardsToday: { coins: 2, double: 0 },
  caps: { coins: 5, double: 3, adCoins: 25 },
};

describe('parseWallet', () => {
  it('reads the server wallet', () => {
    expect(parseWallet(wallet)).toEqual(wallet);
  });

  it('refuses a wallet without coins', () => {
    expect(() => parseWallet({ ...wallet, coins: '130' })).toThrow('Bad coins');
  });
});

describe('parseStoreCatalog', () => {
  it('reads items, products and the wallet', () => {
    const catalog = parseStoreCatalog({
      items: [
        { id: 'mahogany', kind: 'board', name: 'Mahogany', price: 400, supporterOnly: false },
      ],
      products: [{ id: 'baghchal.supporter', kind: 'pass', coins: 0 }],
      wallet,
    });
    expect(catalog.items[0]?.name).toBe('Mahogany');
    expect(catalog.products[0]?.kind).toBe('pass');
    expect(catalog.wallet.owned).toEqual(['mahogany']);
  });

  it('refuses an unknown item kind', () => {
    expect(() =>
      parseStoreCatalog({
        items: [{ id: 'x', kind: 'hat', name: 'Hat', price: 1, supporterOnly: false }],
        products: [],
        wallet,
      }),
    ).toThrow('Bad store item');
  });
});
