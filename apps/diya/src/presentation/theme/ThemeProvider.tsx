import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { DUSK, NIGHT, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(NIGHT);

/** Night or Dusk: the player's choice, or the device's dark/light setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.light === 'dusk') return DUSK;
    if (settings.light === 'night') return NIGHT;
    return system === 'light' ? DUSK : NIGHT;
  }, [settings.light, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
