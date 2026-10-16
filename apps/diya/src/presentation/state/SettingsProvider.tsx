import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { SILENT_HAPTICS, silentSounds, type IHaptics, type ISoundPlayer } from 'app-kit';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from '@/domain/entities/Settings';
import type { SoundCue } from '@/domain/ports/Sounds';
import { haptics as deviceHaptics, sounds as deviceSounds, storage } from '@/config/container';

const KEY = 'diya.settings.v1';
const SILENT = silentSounds<SoundCue>();

interface SettingsValue {
  readonly settings: Settings;
  readonly loaded: boolean;
  update(patch: Partial<Settings>): void;
  /** Haptics and sounds that respect the player's switches. */
  readonly haptics: IHaptics;
  readonly sounds: ISoundPlayer<SoundCue>;
  /** Calmer motion: the OS setting unless the player chose otherwise. */
  readonly calmMotion: boolean;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const osReduced = useReducedMotion();

  useEffect(() => {
    let live = true;
    void storage
      .getItem(KEY)
      .catch(() => null)
      .then((raw) => {
        if (!live) return;
        setSettings(parseSettings(raw));
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  // Turning sound off silences the hum at once.
  useEffect(() => {
    if (!settings.sound) deviceSounds.loop(0);
  }, [settings.sound]);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      loaded,
      update,
      haptics: settings.haptics ? deviceHaptics : SILENT_HAPTICS,
      sounds: settings.sound ? deviceSounds : SILENT,
      calmMotion: settings.reduceMotion ?? osReduced,
    }),
    [settings, loaded, update, osReduced],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
