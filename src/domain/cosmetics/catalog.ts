/** `style` changes how the 5-6 player round table is drawn, not its colours. */
export type CosmeticKind = 'board' | 'dice' | 'pack' | 'style';
export interface Cosmetic {
  readonly id: string;
  readonly kind: CosmeticKind;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly rarity: 'Classic' | 'Rare' | 'Epic' | 'Legendary';
  /** Reserved for an externally verified store product, never a client-side payment. */
  readonly productId?: string;
  readonly contents?: { readonly board: string; readonly dice: string };
}

const INDIVIDUALS: readonly Cosmetic[] = [
  {
    id: 'heritage',
    kind: 'board',
    name: 'Heritage Wood',
    description: 'Warm ivory wood. Forest, mustard, brick and deep blue.',
    price: 250,
    rarity: 'Rare',
  },
  {
    id: 'classic',
    kind: 'board',
    name: 'Arcade Classic',
    description: 'The original. Always a good move.',
    price: 0,
    rarity: 'Classic',
  },
  {
    id: 'royal',
    kind: 'board',
    name: 'Royal Palace',
    description: 'A seat at the golden table.',
    price: 600,
    rarity: 'Legendary',
  },
  {
    id: 'neon',
    kind: 'board',
    name: 'Neon Nights',
    description: 'After dark, every move glows.',
    price: 450,
    rarity: 'Epic',
  },
  {
    id: 'forest',
    kind: 'board',
    name: 'Forest Retreat',
    description: 'A little closer to nature.',
    price: 250,
    rarity: 'Rare',
  },
  {
    id: 'ocean',
    kind: 'board',
    name: 'Ocean Blue',
    description: 'Make waves on the board.',
    price: 250,
    rarity: 'Rare',
  },
  {
    id: 'rose',
    kind: 'board',
    name: 'Rose Quartz',
    description: 'Soft tones. Sharp strategy.',
    price: 350,
    rarity: 'Rare',
  },
  {
    id: 'sunset',
    kind: 'board',
    name: 'Desert Sunset',
    description: 'Warm sands, golden victories.',
    price: 350,
    rarity: 'Rare',
  },
  {
    id: 'arctic',
    kind: 'board',
    name: 'Arctic Frost',
    description: 'Keep your cool. Take the lead.',
    price: 450,
    rarity: 'Epic',
  },
  {
    id: 'cosmic',
    kind: 'board',
    name: 'Cosmic Voyage',
    description: 'Your next win is written in the stars.',
    price: 600,
    rarity: 'Legendary',
  },
  {
    id: 'jade',
    kind: 'board',
    name: 'Jade Dynasty',
    description: 'Crafted for a timeless game.',
    price: 450,
    rarity: 'Epic',
  },
  {
    id: 'candy',
    kind: 'board',
    name: 'Candy Club',
    description: 'A sweet twist on a classic.',
    price: 300,
    rarity: 'Rare',
  },
  {
    id: 'obsidian',
    kind: 'board',
    name: 'Obsidian Gold',
    description: 'Quiet confidence. Pure gold.',
    price: 750,
    rarity: 'Legendary',
  },
  {
    id: 'ivory',
    kind: 'dice',
    name: 'Ivory Original',
    description: 'A familiar roll, beautifully made.',
    price: 0,
    rarity: 'Classic',
  },
  {
    id: 'gold',
    kind: 'dice',
    name: 'Golden Hour',
    description: 'A little gold in every roll.',
    price: 300,
    rarity: 'Rare',
  },
  {
    id: 'ruby',
    kind: 'dice',
    name: 'Ruby Red',
    description: 'Bold, bright, ready to roll.',
    price: 250,
    rarity: 'Rare',
  },
  {
    id: 'mint',
    kind: 'dice',
    name: 'Fresh Mint',
    description: 'A refreshing change of luck.',
    price: 250,
    rarity: 'Rare',
  },
  {
    id: 'galaxy',
    kind: 'dice',
    name: 'Galaxy Dice',
    description: 'A small piece of the universe.',
    price: 450,
    rarity: 'Epic',
  },
  {
    id: 'midnight',
    kind: 'dice',
    name: 'Midnight Metal',
    description: 'Dark finish. Golden details.',
    price: 500,
    rarity: 'Legendary',
  },
];
/** How the homes on the 5-6 player table are drawn. The first is everyone's default. */
export const DEFAULT_TABLE_STYLE = 'triangle-homes';
const STYLES: readonly Cosmetic[] = [
  {
    id: DEFAULT_TABLE_STYLE,
    kind: 'style',
    name: 'Pointed Homes',
    description: 'Big tables: each home fills the space between the arms.',
    price: 0,
    rarity: 'Classic',
  },
  {
    id: 'round-homes',
    kind: 'style',
    name: 'Round Homes',
    description: 'The original round yards for 5 and 6 player tables.',
    price: 200,
    rarity: 'Rare',
  },
];
const boards = INDIVIDUALS.filter((item) => item.kind === 'board');
export const COSMETICS: readonly Cosmetic[] = [
  ...INDIVIDUALS,
  ...STYLES,
  ...boards.map((board): Cosmetic => ({
    id: board.id + '-dice',
    kind: 'dice',
    name: board.name + ' Dice',
    description: 'The matching signature dice for ' + board.name + '.',
    price: board.price === 0 ? 0 : 150,
    rarity: board.rarity,
  })),
  ...boards.map((board): Cosmetic => ({
    id: board.id + '-pack',
    kind: 'pack',
    name: board.id === 'heritage' ? 'Wooden Theme Pack' : board.name + ' Pack',
    description: 'Matching board, signature dice, player cards and app styling.',
    price: board.price === 0 ? 0 : board.price + 100,
    rarity: board.rarity,
    contents: { board: board.id, dice: board.id + '-dice' },
  })),
];
export function isCosmeticEquipped(
  profile: { board: string; dice: string; pack: string | null; style?: string },
  item: Cosmetic,
): boolean {
  if (item.kind === 'style') return (profile.style ?? DEFAULT_TABLE_STYLE) === item.id;
  return item.kind === 'pack'
    ? profile.pack === item.id &&
        profile.board === item.contents?.board &&
        profile.dice === item.contents?.dice
    : profile[item.kind] === item.id;
}
export function getCosmetic(id: string): Cosmetic {
  const item = COSMETICS.find((entry) => entry.id === id);
  if (!item) throw new Error('This item is not in the store.');
  return item;
}
