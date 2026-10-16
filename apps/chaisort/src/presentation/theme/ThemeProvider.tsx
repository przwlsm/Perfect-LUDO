import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { EVENING, MORNING, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(EVENING);

/** Evening or Morning: the player's choice, or the device's dark/light setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.light === 'morning') return MORNING;
    if (settings.light === 'evening') return EVENING;
    return system === 'light' ? MORNING : EVENING;
  }, [settings.light, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}
