import { useCallback, useEffect, useState } from 'react';
import { preferencesStore } from '@/config/container';

export interface UseBooleanPreferenceResult {
  readonly value: boolean;
  readonly isLoaded: boolean;
  setValue(next: boolean): void;
}

/**
 * A persisted on/off setting, backed by the composition root's
 * IKeyValueStore. `isLoaded` starts false so callers can avoid flashing
 * the default before the real stored value (if any) arrives.
 */
export function useBooleanPreference(
  key: string,
  defaultValue: boolean,
): UseBooleanPreferenceResult {
  const [value, setStoredValue] = useState(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    preferencesStore.getItem(key).then((stored) => {
      if (cancelled) return;
      if (stored !== null) setStoredValue(stored === 'true');
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const setValue = useCallback(
    (next: boolean) => {
      setStoredValue(next);
      void preferencesStore.setItem(key, String(next));
    },
    [key],
  );

  return { value, isLoaded, setValue };
}
