import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { PAPER, SLATE, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(PAPER);

/** Paper or Slate: the learner's choice, or the device's light/dark setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.theme === 'paper') return PAPER;
    if (settings.theme === 'slate') return SLATE;
    return system === 'dark' ? SLATE : PAPER;
  }, [settings.theme, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
