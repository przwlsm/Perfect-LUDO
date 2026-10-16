import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { DAY, NIGHT, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(NIGHT);

/** Night or Day: the player's choice, or the device's light/dark setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.theme === 'day') return DAY;
    if (settings.theme === 'night') return NIGHT;
    return system === 'light' ? DAY : NIGHT;
  }, [settings.theme, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
