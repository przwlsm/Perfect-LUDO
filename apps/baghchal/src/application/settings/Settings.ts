import type { IKeyValueStore } from '@/domain/ports/IKeyValueStore';

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true };

const KEY = 'settings';

/** The saved settings, with the defaults for anything missing, unreadable or not a boolean. */
export async function loadSettings(store: IKeyValueStore): Promise<Settings> {
  try {
    const raw = await store.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;
    const saved = parsed as Record<string, unknown>;
    return {
      sound: typeof saved.sound === 'boolean' ? saved.sound : DEFAULT_SETTINGS.sound,
      haptics: typeof saved.haptics === 'boolean' ? saved.haptics : DEFAULT_SETTINGS.haptics,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(store: IKeyValueStore, settings: Settings): Promise<void> {
  await store.setItem(KEY, JSON.stringify(settings));
}
