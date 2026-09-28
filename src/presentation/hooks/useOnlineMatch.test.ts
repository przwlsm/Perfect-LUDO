import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createGame, seatColors, type OnlineMatchSnapshot } from '@/domain';
import { useOnlineMatch } from './useOnlineMatch';
const mockGet = jest.fn();
const mockRoll = jest.fn();
const mockSubmit = jest.fn();
let mockChanged: () => void;
jest.mock('@/config/container', () => ({
  authProvider: { getCurrentUser: () => ({ uid: 'me' }) },
  matchSyncRepository: {
    getMatchForLobby: (...args: unknown[]) => mockGet(...args),
    rollDice: (...args: unknown[]) => mockRoll(...args),
    submitTurn: (...args: unknown[]) => mockSubmit(...args),
    subscribe: (_id: string, changed: () => void) => {
      mockChanged = changed;
      return () => {};
    },
  },
}));
jest.mock('../state/SocialProvider', () => ({ useSocial: () => ({ signedIn: true }) }));
function snapshot(version = 0, lastRoll: 1 | 6 | null = null): OnlineMatchSnapshot {
  return {
    serverNow: new Date().toISOString(),
    mySeat: 0,
    players: [],
    match: {
      id: 'match',
      lobbyId: 'room',
      playerCount: 2,
      status: 'IN_PROGRESS',
      state: createGame(seatColors(2)),
      version,
      turnSeat: 0,
      lastRoll,
      winnerSeat: null,
      stake: 0,
      pool: 0,
      prize: 0,
      turnDeadline: null,
    },
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(snapshot());
});
it('recovers a failed initial connection without reopening the screen', async () => {
  mockGet.mockRejectedValueOnce(new Error('Connection lost'));
  const { result } = await renderHook(() => useOnlineMatch('room', true));
  await waitFor(() => expect(result.current.error).toBe('Connection lost'));
  expect(result.current.fatal).toBeNull();
  await act(() => result.current.retry());
  await waitFor(() => expect(result.current.match).not.toBeNull());
  expect(result.current.error).toBeNull();
});
it('ignores an older response arriving after a newer turn', async () => {
  const { result } = await renderHook(() => useOnlineMatch('room', true));
  await waitFor(() => expect(result.current.match).not.toBeNull());
  let resolveOld!: (s: OnlineMatchSnapshot) => void;
  mockGet.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  await act(() => mockChanged());
  mockGet.mockResolvedValueOnce(snapshot(2, 6));
  await act(() => mockChanged());
  await waitFor(() => expect(result.current.match?.state.lastRoll).toBe(6));
  await act(() => resolveOld(snapshot(1, 1)));
  expect(result.current.match?.state.lastRoll).toBe(6);
});
it('locks rapid roll taps and sends the expected server version', async () => {
  mockRoll.mockResolvedValue(snapshot(1, 6));
  const { result } = await renderHook(() => useOnlineMatch('room', false));
  await waitFor(() => expect(result.current.humanTurn).toBe(true));
  await act(() => {
    result.current.roll();
    result.current.roll();
  });
  expect(mockRoll).toHaveBeenCalledTimes(1);
  expect(mockRoll).toHaveBeenCalledWith('match', 0);
  await waitFor(() => expect(result.current.busy).toBe(false));
});
it('does not endlessly resubmit an automatic move after a failure', async () => {
  mockGet.mockResolvedValue(snapshot(1, 1)); // All coins in yard: pass automatically.
  mockSubmit.mockRejectedValue(new Error('Move could not be sent'));
  const { result } = await renderHook(() => useOnlineMatch('room', false));
  await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1), { timeout: 2500 });
  await waitFor(() => expect(result.current.busy).toBe(false), { timeout: 2500 });
  await act(() => new Promise((resolve) => setTimeout(resolve, 950)));
  expect(mockSubmit).toHaveBeenCalledTimes(1);
  expect(result.current.error).toBe('Move could not be sent');
});
