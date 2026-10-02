import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { preferencesStore } from '@/config/container';
import { PREFERENCE_KEYS } from '../preferenceKeys';
import { DARK, PALETTES, type Palette, type Scheme } from './palette';

/** What the player chose in Settings; 'system' follows the phone. */
export type AppearancePreference = Scheme | 'system';

const PREFERENCES: readonly AppearancePreference[] = ['system', 'light', 'dark'];

function isPreference(value: unknown): value is AppearancePreference {
  return PREFERENCES.includes(value as AppearancePreference);
}

interface AppearanceContextValue {
  readonly preference: AppearancePreference;
  readonly scheme: Scheme;
  /** The colour tokens for the current scheme. */
  readonly ui: Palette;
  setPreference(preference: AppearancePreference): void;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  preference: 'dark',
  scheme: 'dark',
  ui: DARK,
  setPreference: () => undefined,
});

/**
 * Day or night, by the player's choice or the phone's. Holds the first frame
 * until the saved choice is read, so the app never flashes the wrong mode.
 * Outside the provider (e.g. the crash screen) everything reads as night.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference | null>(null);

  useEffect(() => {
    void preferencesStore
      .getItem(PREFERENCE_KEYS.APPEARANCE)
      .catch(() => null)
      .then((saved) => setPreferenceState(isPreference(saved) ? saved : 'system'));
  }, []);

  const resolved = preference ?? 'system';
  const scheme: Scheme = resolved === 'system' ? (system === 'light' ? 'light' : 'dark') : resolved;
  const ui = PALETTES[scheme];

  // The native root view shows behind screen transitions and the keyboard.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(ui.background).catch(() => undefined);
  }, [ui.background]);

  const setPreference = useCallback((next: AppearancePreference) => {
    setPreferenceState(next);
    void preferencesStore.setItem(PREFERENCE_KEYS.APPEARANCE, next).catch(() => undefined);
  }, []);

  if (preference === null) return null;
  return (
    <AppearanceContext.Provider value={{ preference: resolved, scheme, ui, setPreference }}>
      {children}
    </AppearanceContext.Provider>
  );
}

/**
 * Renders its children in a fixed scheme, whatever the app's. Day mode uses
 * it for "navy islands" (the Quick Match hero): a dark card on the bright page
 * whose text, badges and buttons all take the night tokens automatically.
 */
export function SchemeScope({ scheme, children }: { scheme: Scheme; children: ReactNode }) {
  const outer = useContext(AppearanceContext);
  return (
    <AppearanceContext.Provider value={{ ...outer, scheme, ui: PALETTES[scheme] }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}

/** The colour tokens for the current appearance. */
export function useUi(): Palette {
  return useContext(AppearanceContext).ui;
}

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/**
 * A stylesheet that depends on the appearance. Built once per scheme and
 * cached, so switching day/night costs one StyleSheet per screen, not one per
 * render:
 *
 *   const useStyles = makeStyles((ui) => ({ title: { color: ui.text } }));
 *   const s = useStyles();
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (ui: Palette) => T): () => T {
  const cache = new Map<Palette, T>();
  return function useStyles(): T {
    const { ui } = useContext(AppearanceContext);
    let styles = cache.get(ui);
    if (!styles) {
      styles = StyleSheet.create(factory(ui));
      cache.set(ui, styles);
    }
    return styles;
  };
}
