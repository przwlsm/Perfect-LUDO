import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Image } from 'react-native';
import { Skia, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { LANGUAGE_INFO, type CardLanguage } from '@/domain/entities/Language';
import type { TypeStyle } from '@/domain/entities/Template';

/**
 * Fonts the cards are drawn with (all SIL Open Font License). Each script
 * gets a Baloo family made for it, so Indian scripts shape correctly
 * (conjuncts, vowel signs) through Skia's paragraph engine.
 */
export const FAMILY = {
  yatra: 'Yatra One',
  playfair: 'Playfair Display',
  playfairItalic: 'Playfair Display Italic',
  vibes: 'Great Vibes',
  kalam: 'Kalam',
  baloo: 'Baloo 2',
  bhai: 'Baloo Bhai 2',
  bhaijaan: 'Baloo Bhaijaan 2',
  da: 'Baloo Da 2',
  tamma: 'Baloo Tamma 2',
  tammudu: 'Baloo Tammudu 2',
  thambi: 'Baloo Thambi 2',
} as const;

const SOURCES = {
  [FAMILY.yatra]: [require('@expo-google-fonts/yatra-one/400Regular/YatraOne_400Regular.ttf')],
  [FAMILY.playfair]: [
    require('@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf'),
  ],
  [FAMILY.playfairItalic]: [
    require('@expo-google-fonts/playfair-display/600SemiBold_Italic/PlayfairDisplay_600SemiBold_Italic.ttf'),
  ],
  [FAMILY.vibes]: [require('@expo-google-fonts/great-vibes/400Regular/GreatVibes_400Regular.ttf')],
  [FAMILY.kalam]: [require('@expo-google-fonts/kalam/700Bold/Kalam_700Bold.ttf')],
  [FAMILY.baloo]: [require('@expo-google-fonts/baloo-2/600SemiBold/Baloo2_600SemiBold.ttf')],
  [FAMILY.bhai]: [
    require('@expo-google-fonts/baloo-bhai-2/600SemiBold/BalooBhai2_600SemiBold.ttf'),
  ],
  [FAMILY.bhaijaan]: [
    require('@expo-google-fonts/baloo-bhaijaan-2/600SemiBold/BalooBhaijaan2_600SemiBold.ttf'),
  ],
  [FAMILY.da]: [require('@expo-google-fonts/baloo-da-2/600SemiBold/BalooDa2_600SemiBold.ttf')],
  [FAMILY.tamma]: [
    require('@expo-google-fonts/baloo-tamma-2/600SemiBold/BalooTamma2_600SemiBold.ttf'),
  ],
  [FAMILY.tammudu]: [
    require('@expo-google-fonts/baloo-tammudu-2/600SemiBold/BalooTammudu2_600SemiBold.ttf'),
  ],
  [FAMILY.thambi]: [
    require('@expo-google-fonts/baloo-thambi-2/600SemiBold/BalooThambi2_600SemiBold.ttf'),
  ],
};

/** Any glyph the first choice lacks (a Tamil name on an English card, say) falls back through these. */
const FALLBACK = [
  FAMILY.baloo,
  FAMILY.thambi,
  FAMILY.tammudu,
  FAMILY.tamma,
  FAMILY.da,
  FAMILY.bhai,
  FAMILY.bhaijaan,
];

const SCRIPT_FAMILY: Record<string, string> = {
  devanagari: FAMILY.baloo,
  tamil: FAMILY.thambi,
  telugu: FAMILY.tammudu,
  kannada: FAMILY.tamma,
  bengali: FAMILY.da,
  gujarati: FAMILY.bhai,
  arabic: FAMILY.bhaijaan,
};

export type TextRole = 'headline' | 'body' | 'sign';

export interface FontChoice {
  readonly families: string[];
  /** Some faces run small or large; this evens them out. */
  readonly scale: number;
  /** Line height multiplier that suits the face and script. */
  readonly height: number;
  /** Extra space between words, as a fraction of the size (script faces set them tight). */
  readonly wordSpacing?: number;
}

/** The fonts for one role of a card's words in a language and lettering style. */
export function fontFor(language: CardLanguage, style: TypeStyle, role: TextRole): FontChoice {
  const script = LANGUAGE_INFO[language].script;
  const make = (family: string, scale = 1, height = 1.18): FontChoice => ({
    families: [family, ...FALLBACK.filter((f) => f !== family)],
    scale,
    height,
    wordSpacing: family === FAMILY.vibes ? 0.16 : 0,
  });
  if (script === 'latin') {
    if (role === 'headline') {
      switch (style) {
        case 'festive':
          return make(FAMILY.yatra, 0.96, 1.12);
        case 'elegant':
          return make(FAMILY.playfair, 0.95, 1.1);
        case 'script':
          return make(FAMILY.vibes, 1.32, 1.0);
        case 'hand':
          return make(FAMILY.kalam, 1.0, 1.05);
        default:
          return make(FAMILY.baloo, 1.0, 1.05);
      }
    }
    if (role === 'body') {
      if (style === 'elegant' || style === 'script') return make(FAMILY.playfairItalic, 0.96, 1.32);
      if (style === 'hand') return make(FAMILY.kalam, 1.0, 1.25);
      return make(FAMILY.baloo, 1.0, 1.22);
    }
    if (style === 'script' || style === 'elegant') return make(FAMILY.vibes, 1.3, 1.1);
    if (style === 'hand') return make(FAMILY.kalam, 1.0, 1.15);
    return make(FAMILY.playfairItalic, 0.95, 1.15);
  }
  if (script === 'devanagari') {
    if (style === 'festive' && role !== 'body') return make(FAMILY.yatra, 1.0, 1.2);
    if (style === 'hand') return make(FAMILY.kalam, 1.0, role === 'body' ? 1.3 : 1.2);
    return make(FAMILY.baloo, 1.0, role === 'body' ? 1.3 : 1.15);
  }
  // Tamil runs wide and long; Urdu needs room above and below.
  const scale = script === 'tamil' ? 0.88 : script === 'arabic' ? 1.05 : 0.95;
  const height = script === 'arabic' ? 1.45 : role === 'body' ? 1.32 : 1.2;
  return make(SCRIPT_FAMILY[script] ?? FAMILY.baloo, scale, height);
}

const FontsContext = createContext<SkTypefaceFontProvider | null>(null);

/** Where a bundled font lives: a module id on phones, a URL string in a browser. */
function uriOf(source: unknown): string {
  if (typeof source === 'string') return source;
  if (typeof source === 'number') return Image.resolveAssetSource(source)?.uri ?? '';
  if (source && typeof source === 'object') {
    const s = source as { uri?: string; default?: string };
    return s.uri ?? s.default ?? '';
  }
  return '';
}

let loading: Promise<SkTypefaceFontProvider> | null = null;

/**
 * Reads every card font into one provider for Skia's paragraph engine. A
 * font that fails to load is skipped (its script falls back to the others)
 * rather than holding every card back.
 */
function loadCardFonts(): Promise<SkTypefaceFontProvider> {
  loading ??= Promise.all(
    Object.entries(SOURCES).map(async ([family, [source]]) => {
      try {
        const data = await Skia.Data.fromURI(uriOf(source));
        const face = Skia.Typeface.MakeFreeTypeFaceFromData(data);
        return face ? ([family, face] as const) : null;
      } catch {
        return null;
      }
    }),
  ).then((faces) => {
    const provider = Skia.TypefaceFontProvider.Make();
    for (const entry of faces) if (entry) provider.registerFont(entry[1], entry[0]);
    return provider;
  });
  return loading;
}

/** Loads every card font once; cards wait (show a soft placeholder) until they are in. */
export function CardFontsProvider({ children }: PropsWithChildren) {
  const [fonts, setFonts] = useState<SkTypefaceFontProvider | null>(null);
  useEffect(() => {
    let live = true;
    void loadCardFonts().then((provider) => {
      if (live) setFonts(provider);
    });
    return () => {
      live = false;
    };
  }, []);
  return <FontsContext.Provider value={fonts}>{children}</FontsContext.Provider>;
}

export function useCardFonts(): SkTypefaceFontProvider | null {
  return useContext(FontsContext);
}
