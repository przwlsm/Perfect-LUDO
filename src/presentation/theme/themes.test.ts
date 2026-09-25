import { COSMETICS, isCosmeticEquipped } from '@/domain/cosmetics/catalog';
import { BOARD_THEMES, DICE_FINISHES, getCardDesign } from './themes';

it('every theme pack has a real board, unique signature dice, and card styling', () => {
  const packs = COSMETICS.filter((c) => c.kind === 'pack');
  expect(packs).toHaveLength(BOARD_THEMES.length);
  expect(new Set(packs.map((p) => p.contents!.dice)).size).toBe(packs.length);
  for (const p of packs) {
    expect(BOARD_THEMES.some((t) => t.id === p.contents!.board)).toBe(true);
    expect(DICE_FINISHES[p.contents!.dice]).toBeDefined();
    expect(getCardDesign(p.id).borderRadius).toBeGreaterThan(0);
  }
  expect(getCardDesign('heritage-pack')).not.toEqual(getCardDesign('neon-pack'));
});
it('a mixed loadout is not marked as a fully equipped pack', () => {
  const item = COSMETICS.find((c) => c.id === 'heritage-pack')!;
  expect(
    isCosmeticEquipped({ board: 'heritage', dice: 'heritage-dice', pack: item.id }, item),
  ).toBe(true);
  expect(isCosmeticEquipped({ board: 'classic', dice: 'heritage-dice', pack: item.id }, item)).toBe(
    false,
  );
});
