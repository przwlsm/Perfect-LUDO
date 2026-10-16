import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { COURTYARD, DAWN, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(DAWN);

/** Dawn or Courtyard: the player's choice, or the device's dark/light setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.theme === 'courtyard') return COURTYARD;
    if (settings.theme === 'dawn') return DAWN;
    return system === 'light' ? COURTYARD : DAWN;
  }, [settings.theme, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
