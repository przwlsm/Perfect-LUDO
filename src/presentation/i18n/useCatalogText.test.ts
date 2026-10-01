import { act, renderHook } from '@testing-library/react-native';
import { GAME_VARIANTS } from '@/domain';
import { COSMETICS } from '@/domain/cosmetics/catalog';
import { i18n } from './index';
import { useCatalogText } from './useCatalogText';

/** Switches language before mounting, so no mounted hook re-renders outside act(). */
const switchTo = (language: string) => act(() => i18n.changeLanguage(language));

describe('useCatalogText', () => {
  afterEach(() => switchTo('en'));

  it('names every cosmetic and mode in every language without falling back', async () => {
    for (const language of ['en', 'hi']) {
      await switchTo(language);
      const { result, unmount } = await renderHook(() => useCatalogText());
      for (const item of COSMETICS) {
        const name = result.current.cosmeticName(item);
        expect(name.trim()).not.toBe('');
        // English must match the domain's own wording exactly.
        if (language === 'en') expect(name).toBe(item.name);
        if (language === 'en')
          expect(result.current.cosmeticDescription(item)).toBe(item.description);
      }
      for (const variant of GAME_VARIANTS) {
        expect(result.current.variantTitle(variant)).not.toMatch(/^variants\./);
      }
      await unmount();
    }
  });

  it('translates derived dice and packs from their board', async () => {
    await switchTo('hi');
    const { result, unmount } = await renderHook(() => useCatalogText());
    expect(result.current.cosmeticName({ id: 'royal-dice', name: 'Royal Palace Dice' })).toBe(
      'रॉयल पैलेस पासा',
    );
    await unmount();
  });
});
