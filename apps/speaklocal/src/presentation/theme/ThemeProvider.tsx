import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../state/SettingsProvider';
import { BUBBLE_LOOKS, DAY, DUSK, type BubbleLook, type Palette } from './palette';

export const ThemeContext = createContext<Palette>(DAY);

/** Day or Dusk: the learner's choice, or the device's light/dark setting. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const palette = useMemo(() => {
    if (settings.theme === 'day') return DAY;
    if (settings.theme === 'dusk') return DUSK;
    return system === 'dark' ? DUSK : DAY;
  }, [settings.theme, system]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Palette {
  return useContext(ThemeContext);
}

/** Your chat bubbles in the chosen chat colours (premium ones need to be open). */
export function useBubbleLook(open: boolean): BubbleLook {
  const theme = useTheme();
  const { settings } = useSettings();
  const id = open ? settings.bubbles : 'classic';
  return BUBBLE_LOOKS[id][theme.scheme];
}
