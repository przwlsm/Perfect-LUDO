import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { IVORY, NIGHT, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(NIGHT);

/** Night or Ivory: the sender's choice, or the device's light/dark setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.theme === 'ivory') return IVORY;
    if (settings.theme === 'night') return NIGHT;
    return system === 'light' ? IVORY : NIGHT;
  }, [settings.theme, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
