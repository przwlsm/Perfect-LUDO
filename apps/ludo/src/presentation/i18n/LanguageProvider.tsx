import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, DevSettings, I18nManager } from 'react-native';
import * as Font from 'expo-font';
import * as Updates from 'expo-updates';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import { preferencesStore } from '@/config/container';
import { PREFERENCE_KEYS } from '../preferenceKeys';
import { deviceLanguage, i18n } from './index';
import {
  isLanguageCode,
  isRightToLeft,
  LANGUAGES,
  type LanguageCode,
  type LanguagePreference,
  type Script,
} from './languages';
import { ScriptContext } from './ScriptContext';

// Font files are required one by one so only the weights listed here are bundled.
/**
 * Font files per script, registered under the family names that
 * theme/typography.ts uses. Loaded on demand, so a player only ever loads
 * their own script's glyphs into memory. Baloo sister families other than
 * Baloo 2 ship three weights (see typography.ts).
 */
const SCRIPT_FONTS: Record<Script, () => Record<string, number>> = {
  latin: () => ({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  }),
  devanagari: () => ({
    Baloo2_400Regular: require('@expo-google-fonts/baloo-2/400Regular/Baloo2_400Regular.ttf'),
    Baloo2_500Medium: require('@expo-google-fonts/baloo-2/500Medium/Baloo2_500Medium.ttf'),
    Baloo2_600SemiBold: require('@expo-google-fonts/baloo-2/600SemiBold/Baloo2_600SemiBold.ttf'),
    Baloo2_700Bold: require('@expo-google-fonts/baloo-2/700Bold/Baloo2_700Bold.ttf'),
    Baloo2_800ExtraBold: require('@expo-google-fonts/baloo-2/800ExtraBold/Baloo2_800ExtraBold.ttf'),
  }),
  bengali: () => ({
    BalooDa2_400Regular: require('@expo-google-fonts/baloo-da-2/400Regular/BalooDa2_400Regular.ttf'),
    BalooDa2_600SemiBold: require('@expo-google-fonts/baloo-da-2/600SemiBold/BalooDa2_600SemiBold.ttf'),
    BalooDa2_800ExtraBold: require('@expo-google-fonts/baloo-da-2/800ExtraBold/BalooDa2_800ExtraBold.ttf'),
  }),
  tamil: () => ({
    BalooThambi2_400Regular: require('@expo-google-fonts/baloo-thambi-2/400Regular/BalooThambi2_400Regular.ttf'),
    BalooThambi2_600SemiBold: require('@expo-google-fonts/baloo-thambi-2/600SemiBold/BalooThambi2_600SemiBold.ttf'),
    BalooThambi2_800ExtraBold: require('@expo-google-fonts/baloo-thambi-2/800ExtraBold/BalooThambi2_800ExtraBold.ttf'),
  }),
  telugu: () => ({
    BalooTammudu2_400Regular: require('@expo-google-fonts/baloo-tammudu-2/400Regular/BalooTammudu2_400Regular.ttf'),
    BalooTammudu2_600SemiBold: require('@expo-google-fonts/baloo-tammudu-2/600SemiBold/BalooTammudu2_600SemiBold.ttf'),
    BalooTammudu2_800ExtraBold: require('@expo-google-fonts/baloo-tammudu-2/800ExtraBold/BalooTammudu2_800ExtraBold.ttf'),
  }),
  gujarati: () => ({
    BalooBhai2_400Regular: require('@expo-google-fonts/baloo-bhai-2/400Regular/BalooBhai2_400Regular.ttf'),
    BalooBhai2_600SemiBold: require('@expo-google-fonts/baloo-bhai-2/600SemiBold/BalooBhai2_600SemiBold.ttf'),
    BalooBhai2_800ExtraBold: require('@expo-google-fonts/baloo-bhai-2/800ExtraBold/BalooBhai2_800ExtraBold.ttf'),
  }),
  kannada: () => ({
    BalooTamma2_400Regular: require('@expo-google-fonts/baloo-tamma-2/400Regular/BalooTamma2_400Regular.ttf'),
    BalooTamma2_600SemiBold: require('@expo-google-fonts/baloo-tamma-2/600SemiBold/BalooTamma2_600SemiBold.ttf'),
    BalooTamma2_800ExtraBold: require('@expo-google-fonts/baloo-tamma-2/800ExtraBold/BalooTamma2_800ExtraBold.ttf'),
  }),
  arabic: () => ({
    BalooBhaijaan2_400Regular: require('@expo-google-fonts/baloo-bhaijaan-2/400Regular/BalooBhaijaan2_400Regular.ttf'),
    BalooBhaijaan2_600SemiBold: require('@expo-google-fonts/baloo-bhaijaan-2/600SemiBold/BalooBhaijaan2_600SemiBold.ttf'),
    BalooBhaijaan2_800ExtraBold: require('@expo-google-fonts/baloo-bhaijaan-2/800ExtraBold/BalooBhaijaan2_800ExtraBold.ttf'),
  }),
};

/** Resolves true when the script's fonts are usable; false falls back to Latin. */
async function loadScriptFonts(script: Script): Promise<boolean> {
  try {
    await Font.loadAsync(SCRIPT_FONTS[script]());
    return true;
  } catch {
    return false;
  }
}

function languageFor(preference: LanguagePreference): LanguageCode {
  return preference === 'system' ? deviceLanguage() : preference;
}

/**
 * Right-to-left layouts are fixed when the app starts, so switching direction
 * needs a reload. Never awaited: a reload that cannot run must not hold the
 * app on a blank screen. A reload is tried once per target direction, so a
 * device that ignores the switch can never loop; it applies on the next
 * cold start instead.
 */
async function applyDirection(language: LanguageCode): Promise<void> {
  const rtl = isRightToLeft(LANGUAGES[language]);
  const target = rtl ? 'rtl' : 'ltr';
  if (rtl === I18nManager.isRTL) {
    await preferencesStore.setItem(PREFERENCE_KEYS.DIRECTION_RELOAD, '').catch(() => undefined);
    return;
  }
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  const tried = await preferencesStore.getItem(PREFERENCE_KEYS.DIRECTION_RELOAD).catch(() => null);
  if (tried === target) return;
  await preferencesStore.setItem(PREFERENCE_KEYS.DIRECTION_RELOAD, target).catch(() => undefined);
  if (__DEV__) DevSettings.reload();
  else void Updates.reloadAsync().catch(() => undefined);
}

interface LanguageContextValue {
  readonly preference: LanguagePreference;
  readonly language: LanguageCode;
  setPreference(preference: LanguagePreference): Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Applies the player's language (or the phone's) before the first screen is
 * drawn: reads the saved choice, loads that script's fonts, then renders.
 * The native splash stays up meanwhile. Changing language later re-renders
 * every translated string and swaps fonts in place, without a restart
 * (except when the text direction flips).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');
  const [language, setLanguage] = useState<LanguageCode>(() => languageFor('system'));
  const [script, setScript] = useState<Script>('latin');
  const [ready, setReady] = useState(false);

  const apply = useCallback(async (next: LanguagePreference) => {
    const code = languageFor(next);
    const target = LANGUAGES[code].script;
    const fontsOk = (await loadScriptFonts('latin')) && (await loadScriptFonts(target));
    await i18n.changeLanguage(code);
    setPreferenceState(next);
    setLanguage(code);
    setScript(fontsOk ? target : 'latin');
    void applyDirection(code);
  }, []);

  useEffect(() => {
    void preferencesStore
      .getItem(PREFERENCE_KEYS.LANGUAGE)
      .catch(() => null)
      .then((saved) => apply(isLanguageCode(saved) ? saved : 'system'))
      .finally(() => setReady(true));
  }, [apply]);

  // Following the phone: pick up a language changed in system settings.
  useEffect(() => {
    if (preference !== 'system') return;
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active' && deviceLanguage() !== i18n.language) void apply('system');
    });
    return () => subscription.remove();
  }, [preference, apply]);

  const setPreference = useCallback(
    async (next: LanguagePreference) => {
      await preferencesStore.setItem(PREFERENCE_KEYS.LANGUAGE, next).catch(() => undefined);
      await apply(next);
    },
    [apply],
  );

  if (!ready) return null;
  return (
    <LanguageContext.Provider value={{ preference, language, setPreference }}>
      <ScriptContext.Provider value={script}>{children}</ScriptContext.Provider>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required.');
  return value;
}
