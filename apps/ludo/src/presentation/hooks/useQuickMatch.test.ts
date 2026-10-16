import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { QuickMatchTicket } from '@/domain';
import { HEARTBEAT_MS, useQuickMatch } from './useQuickMatch';

const waiting: QuickMatchTicket = {
  status: 'WAITING',
  lobbyId: null,
  playerCount: 2,
  stake: 0,
  variant: 'classic',
  teams: false,
  waiting: 1,
  serverNow: '2026-01-01T00:00:00Z',
};
const matched: QuickMatchTicket = { ...waiting, status: 'MATCHED', lobbyId: 'lobby-1', waiting: 0 };

const mockRepository = {
  join: jest.fn<Promise<QuickMatchTicket>, [number, number?, string?, boolean?]>(),
  leave: jest.fn(async () => undefined),
  subscribe: jest.fn((_userId: string, _onChange: () => void) => mockUnsubscribe),
};
const mockUnsubscribe = jest.fn();

jest.mock('@/config/container', () => ({
  get matchmakingRepository() {
    return mockRepository;
  },
}));
jest.mock('../state/SocialProvider', () => ({ useSocial: () => ({ userId: 'me' }) }));

beforeEach(() => {
  jest.useFakeTimers();
  mockRepository.join.mockReset();
  mockRepository.leave.mockClear();
  mockRepository.subscribe.mockClear();
  mockUnsubscribe.mockClear();
});
afterEach(() => jest.useRealTimers());

describe('useQuickMatch', () => {
  it('joins, keeps the ticket alive, and reports the lobby once seated', async () => {
    mockRepository.join.mockResolvedValueOnce(waiting).mockResolvedValueOnce(matched);
    const { result } = await renderHook(() => useQuickMatch());
    expect(result.current.phase).toBe('idle');

    await act(() => result.current.start(2));
    expect(result.current.phase).toBe('searching');
    expect(result.current.ticket).toEqual(waiting);
    expect(mockRepository.subscribe).toHaveBeenCalledWith('me', expect.any(Function));

    await act(async () => {
      jest.advanceTimersByTime(HEARTBEAT_MS);
    });
    await waitFor(() => expect(result.current.phase).toBe('matched'));
    expect(result.current.ticket?.lobbyId).toBe('lobby-1');
    // Seated: nothing more to poll, and the channel is released.
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockRepository.join).toHaveBeenCalledTimes(2);
  });

  it('reacts to a realtime change on the ticket without waiting for the timer', async () => {
    mockRepository.join.mockResolvedValueOnce(waiting).mockResolvedValueOnce(matched);
    const { result } = await renderHook(() => useQuickMatch());
    await act(() => result.current.start(3));
    const onChange = mockRepository.subscribe.mock.calls[0]![1];
    await act(async () => {
      onChange();
    });
    await waitFor(() => expect(result.current.phase).toBe('matched'));
    expect(mockRepository.join).toHaveBeenLastCalledWith(3, 0, 'classic', false);
  });

  it('cancelling leaves the queue and stops the heartbeat', async () => {
    mockRepository.join.mockResolvedValue(waiting);
    const { result } = await renderHook(() => useQuickMatch());
    await act(() => result.current.start(2));
    await act(() => result.current.cancel());
    expect(result.current.phase).toBe('idle');
    expect(mockRepository.leave).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(HEARTBEAT_MS * 3);
    });
    expect(mockRepository.join).toHaveBeenCalledTimes(1);
  });

  it('surfaces a refused join and returns to idle', async () => {
    mockRepository.join.mockRejectedValueOnce(new Error('Quick play seats 2 to 4 players.'));
    const { result } = await renderHook(() => useQuickMatch());
    await act(() => result.current.start(2));
    expect(result.current.phase).toBe('idle');
    expect(result.current.error).toMatch(/2 to 4/);
    expect(mockRepository.subscribe).not.toHaveBeenCalled();
  });

  it('leaves the queue if the screen unmounts mid-search', async () => {
    mockRepository.join.mockResolvedValue(waiting);
    const { result, unmount } = await renderHook(() => useQuickMatch());
    await act(() => result.current.start(2));
    await unmount();
    expect(mockRepository.leave).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
