import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { LobbySnapshot } from '@/domain';
import { useLobby } from './useLobby';
const mockJoin = jest.fn(),
  mockGet = jest.fn(),
  mockLeave = jest.fn(),
  mockStart = jest.fn();
jest.mock('@/config/container', () => ({
  challengeRepository: {
    joinLobby: (...args: unknown[]) => mockJoin(...args),
    getLobby: (...args: unknown[]) => mockGet(...args),
    leaveLobby: (...args: unknown[]) => mockLeave(...args),
    startMatch: (...args: unknown[]) => mockStart(...args),
    subscribeToLobby: () => () => {},
  },
}));
jest.mock('../state/SocialProvider', () => ({ useSocial: () => ({ presenceTimeoutSeconds: 60 }) }));
const room = (status = 'WAITING') =>
  ({
    serverNow: new Date().toISOString(),
    lobby: { id: 'room', status, startAt: null },
    players: [],
    challenge: { id: 'challenge' },
  }) as unknown as LobbySnapshot;
beforeEach(() => {
  jest.clearAllMocks();
  mockJoin.mockResolvedValue(room());
  mockGet.mockResolvedValue(room());
});
it('recovers from an initial network failure', async () => {
  mockJoin.mockRejectedValueOnce(new Error('Network unavailable'));
  mockGet.mockRejectedValueOnce(new Error('Network unavailable'));
  const { result } = await renderHook(() => useLobby('room'));
  await waitFor(() => expect(result.current.fatal).toBe('Network unavailable'));
  await act(() => result.current.refresh());
  expect(result.current.snapshot?.lobby.id).toBe('room');
  expect(result.current.fatal).toBeNull();
});
it('reads an already-started lobby so reconnecting can reopen its match', async () => {
  mockJoin.mockRejectedValue(new Error('Not accepting players'));
  mockGet.mockResolvedValue(room('STARTED'));
  const { result } = await renderHook(() => useLobby('room'));
  await waitFor(() => expect(result.current.snapshot?.lobby.status).toBe('STARTED'));
  expect(result.current.fatal).toBeNull();
});
it('reports a failed leave instead of authorizing navigation away', async () => {
  mockLeave.mockRejectedValue(new Error('Network unavailable'));
  const { result } = await renderHook(() => useLobby('room'));
  await waitFor(() => expect(result.current.snapshot).not.toBeNull());
  let success: boolean | undefined;
  await act(async () => {
    success = await result.current.leave();
  });
  expect(success).toBe(false);
  expect(result.current.error).toBe('Network unavailable');
});
it('refreshes without repeatedly joining the room', async () => {
  const { result } = await renderHook(() => useLobby('room'));
  await waitFor(() => expect(result.current.snapshot).not.toBeNull());
  await act(() => result.current.refresh());
  expect(mockJoin).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledTimes(1);
});
