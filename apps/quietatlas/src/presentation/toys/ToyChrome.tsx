import { createContext, useContext, useMemo, useRef, type PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { DAWN, DUSK } from '../theme/palette';
import { ThemeContext } from '../theme/ThemeProvider';

interface ChromeControl {
  /** Fades the chrome back while a finger is busy on the toy. */
  touching(active: boolean): void;
}

interface ChromeState extends ChromeControl {
  readonly dim: SharedValue<number>;
  /** What to do on the next touch of the toy (the shell uses it to retire the hint). */
  onTouch(fn: (() => void) | null): void;
}

const ChromeContext = createContext<ChromeState | null>(null);

/**
 * Wraps a whole toy screen, so both the toy (which reports touches) and its
 * shell (which dims and holds the hint) share one chrome. It also lights the
 * chrome to suit the toy's surface: Dawn glass over pale ink-trays and stone,
 * Dusk glass over dark floors and candlelit rooms.
 */
export function ToyChromeProvider({ surface, children }: PropsWithChildren<{ surface: string }>) {
  const dim = useSharedValue(1);
  const onFirstTouch = useRef<(() => void) | null>(null);
  const value = useMemo<ChromeState>(
    () => ({
      dim,
      onTouch(fn) {
        onFirstTouch.current = fn;
      },
      touching(active) {
        dim.set(withTiming(active ? 0.25 : 1, { duration: active ? 300 : 500 }));
        if (active) onFirstTouch.current?.();
      },
    }),
    [dim],
  );
  const light = isLight(surface);
  const palette = light ? DAWN : DUSK;
  return (
    <ThemeContext.Provider value={palette}>
      {/* The clock and battery icons follow the toy's surface, not the app's light. */}
      <StatusBar style={light ? 'dark' : 'light'} />
      <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>
    </ThemeContext.Provider>
  );
}

const NO_CHROME: ChromeControl = { touching() {} };

export function useChrome(): ChromeControl {
  return useContext(ChromeContext) ?? NO_CHROME;
}

export function useChromeState(): ChromeState | null {
  return useContext(ChromeContext);
}

/** Relative luminance above the midpoint (sRGB approximation) for a #rrggbb colour. */
export function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return false;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55;
}
