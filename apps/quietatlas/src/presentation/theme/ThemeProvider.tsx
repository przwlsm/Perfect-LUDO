import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { DAWN, DUSK, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(DUSK);

/** Dusk or Dawn: the player's choice, or the device's light/dark setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.theme === 'dawn') return DAWN;
    if (settings.theme === 'dusk') return DUSK;
    return system === 'light' ? DAWN : DUSK;
  }, [settings.theme, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
