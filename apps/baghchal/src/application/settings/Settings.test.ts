import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './Settings';

describe('settings', () => {
  it('starts with everything on', async () => {
    expect(await loadSettings(new InMemoryKeyValueStore())).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips what was saved', async () => {
    const store = new InMemoryKeyValueStore();
    await saveSettings(store, { sound: false, haptics: true });
    expect(await loadSettings(store)).toEqual({ sound: false, haptics: true });
  });

  it('falls back field by field on bad data', async () => {
    const store = new InMemoryKeyValueStore();
    await store.setItem('settings', '{"sound":"loud","haptics":false}');
    expect(await loadSettings(store)).toEqual({ sound: true, haptics: false });
    await store.setItem('settings', 'not json');
    expect(await loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back when the store fails', async () => {
    const broken = {
      getItem: () => Promise.reject(new Error('disk')),
      setItem: () => Promise.resolve(),
    };
    expect(await loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
  });
});
