import { act, renderHook, waitFor } from '@testing-library/react-native';
import { InMemoryKeyValueStore } from '@/domain/testing/InMemoryKeyValueStore';
import { useBooleanPreference } from './useBooleanPreference';

// jest.mock calls are hoisted above these imports by babel-plugin-jest-hoist,
// so useBooleanPreference still picks up the fake store below.
const mockPreferencesStore = new InMemoryKeyValueStore();
jest.mock('@/config/container', () => ({
  get preferencesStore() {
    return mockPreferencesStore;
  },
}));

describe('useBooleanPreference', () => {
  it('starts at the default value', async () => {
    const { result } = await renderHook(() => useBooleanPreference('some.key', false));
    expect(result.current.value).toBe(false);
  });

  it('loads a previously stored value', async () => {
    await mockPreferencesStore.setItem('board3d', 'true');

    const { result } = await renderHook(() => useBooleanPreference('board3d', false));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.value).toBe(true);
  });

  it('persists a new value and updates immediately', async () => {
    const { result } = await renderHook(() => useBooleanPreference('toggle.me', false));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(() => {
      result.current.setValue(true);
    });

    expect(result.current.value).toBe(true);
    await expect(mockPreferencesStore.getItem('toggle.me')).resolves.toBe('true');
  });
});
