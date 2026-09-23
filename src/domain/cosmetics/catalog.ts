export type CosmeticKind = 'board' | 'dice';
export interface Cosmetic {
  readonly id: string;
  readonly kind: CosmeticKind;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly rarity: 'Classic' | 'Rare' | 'Epic' | 'Legendary';
  /** Reserved for an externally verified store product, never a client-side payment. */
  readonly productId?: string;
}

export const COSMETICS: readonly Cosmetic[] = [
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
export function getCosmetic(id: string): Cosmetic {
  const item = COSMETICS.find((entry) => entry.id === id);
  if (!item) throw new Error('This item is not in the store.');
  return item;
}
