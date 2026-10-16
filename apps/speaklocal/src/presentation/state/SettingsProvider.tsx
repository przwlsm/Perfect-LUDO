import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { cityById } from '@/domain/content/languages';
import type { LangId } from '@/domain/content/types';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from '@/domain/entities/Settings';
import {
  SILENT_HAPTICS,
  silentSounds,
  type IHaptics,
  type ISoundPlayer,
  type SoundCue,
} from '@/domain/ports';
import { haptics as deviceHaptics, sounds as deviceSounds, storage } from '@/config/container';

const KEY = 'speaklocal.settings.v1';
const SILENT = silentSounds<SoundCue>();

interface SettingsValue {
  readonly settings: Settings;
  readonly loaded: boolean;
  /** The language of the learner's city (Kannada before a city is chosen). */
  readonly lang: LangId;
  update(patch: Partial<Settings>): void;
  /** Marks a one-line first-time hint as seen. */
  seen(tip: string): void;
  /** Haptics and sounds that respect the learner's switches. */
  readonly haptics: IHaptics;
  readonly sounds: ISoundPlayer<SoundCue>;
  /** Calmer motion: the OS setting unless the learner chose otherwise. */
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

  const seen = useCallback((tip: string) => {
    setSettings((prev) => {
      if (prev.tipsSeen.includes(tip)) return prev;
      const next = { ...prev, tipsSeen: [...prev.tipsSeen, tip] };
      void storage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      loaded,
      lang: cityById(settings.city ?? 'bengaluru').lang,
      update,
      seen,
      haptics: settings.haptics ? deviceHaptics : SILENT_HAPTICS,
      sounds: settings.sound ? deviceSounds : SILENT,
      calmMotion: settings.reduceMotion ?? osReduced,
    }),
    [settings, loaded, update, seen, osReduced],
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
