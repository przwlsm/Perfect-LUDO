import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '@/application/settings/Settings';
import { preferencesStore } from '@/config/container';

interface SettingsContextValue {
  readonly settings: Settings;
  readonly update: (changes: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => undefined,
});

/** The player's preferences, loaded once and saved on every change. */
export function SettingsProvider({ children }: { readonly children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let live = true;
    void loadSettings(preferencesStore).then((saved) => {
      if (!live) return;
      setSettings(saved);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // Only once loaded, so the defaults never overwrite what was saved.
  useEffect(() => {
    if (loaded) void saveSettings(preferencesStore, settings).catch(() => undefined);
  }, [loaded, settings]);

  const update = useCallback((changes: Partial<Settings>) => {
    setSettings((previous) => ({ ...previous, ...changes }));
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
