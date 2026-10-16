import { useTranslation } from 'react-i18next';
import type { GameVariant } from '@/domain';
import type { Cosmetic } from '@/domain/cosmetics/catalog';

type ItemText = { readonly name: string; readonly description: string };

/**
 * Player-facing names for things the domain identifies by id: game modes,
 * cosmetics and rarities. The domain keeps its English text for tests and
 * logs; every screen shows these instead, in the current language.
 */
export function useCatalogText() {
  const { t } = useTranslation('common');
  const items = t('cosmetics.items', { returnObjects: true }) as Record<string, ItemText>;

  /** "heritage-dice" -> the Heritage board's name, for derived dice and packs. */
  const baseName = (id: string, suffix: string) => items[id.slice(0, -suffix.length)]?.name;

  return {
    variantTitle: (variant: GameVariant) => t(`variants.${variant}.title`),
    variantShort: (variant: GameVariant) => t(`variants.${variant}.short`),
    variantDescription: (variant: GameVariant) => t(`variants.${variant}.description`),
    rarity: (rarity: Cosmetic['rarity']) => t(`rarity.${rarity}`),
    kind: (kind: Cosmetic['kind']) => t(`kind.${kind}`),
    cosmeticName(item: Pick<Cosmetic, 'id' | 'name'>): string {
      const own = items[item.id]?.name;
      if (own) return own;
      if (item.id === 'heritage-pack') return t('cosmetics.heritagePackName');
      const dice = item.id.endsWith('-dice') ? baseName(item.id, '-dice') : undefined;
      if (dice) return t('cosmetics.diceName', { board: dice });
      const pack = item.id.endsWith('-pack') ? baseName(item.id, '-pack') : undefined;
      if (pack) return t('cosmetics.packName', { board: pack });
      return item.name;
    },
    cosmeticDescription(item: Pick<Cosmetic, 'id' | 'description'>): string {
      const own = items[item.id]?.description;
      if (own) return own;
      const dice = item.id.endsWith('-dice') ? baseName(item.id, '-dice') : undefined;
      if (dice) return t('cosmetics.diceDescription', { board: dice });
      if (item.id.endsWith('-pack')) return t('cosmetics.packDescription');
      return item.description;
    },
  };
}
