import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useUserSearch } from './useUserSearch';
const mockSearch = jest.fn();
jest.mock('@/config/container', () => ({
  friendsRepository: { searchUsers: (...args: unknown[]) => mockSearch(...args) },
}));
it('stops the loading indicator when a search fails', async () => {
  mockSearch.mockRejectedValue(new Error('Offline'));
  const { result } = await renderHook(() => useUserSearch(true));
  await act(() => result.current.setQuery('alex'));
  await waitFor(() => expect(result.current.error).toBe('Offline'));
  expect(result.current.searching).toBe(false);
});
it('ignores a delayed earlier search after the query changes', async () => {
  let resolveOld!: (rows: unknown[]) => void;
  mockSearch
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce([]);
  const { result } = await renderHook(() => useUserSearch(true));
  await act(() => result.current.setQuery('alex'));
  await waitFor(() => expect(resolveOld).toBeDefined());
  await act(() => result.current.setQuery('sam'));
  await waitFor(() => expect(result.current.searching).toBe(false));
  await act(() => resolveOld([{ id: 'old' }]));
  expect(result.current.results).toEqual([]);
  expect(result.current.searching).toBe(false);
});
