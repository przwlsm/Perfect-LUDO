import { act, renderHook, waitFor } from '@testing-library/react-native';
import { newMatch, type SavedMatch } from '@/application/session/MatchRepository';
import { useMatch } from './useMatch';
const mockSave = jest.fn<Promise<void>, [SavedMatch]>().mockResolvedValue(undefined);
const mockLoad = jest.fn<Promise<SavedMatch | null>, []>().mockResolvedValue(null);
const mockRandom = jest.fn<Promise<number>, [number, number]>().mockResolvedValue(6);
jest.mock('@/config/container', () => ({
  matchRepository: { save: (...args: [SavedMatch]) => mockSave(...args), load: () => mockLoad() },
  randomProvider: { nextInt: (...args: [number, number]) => mockRandom(...args) },
}));
const local = { mode: 'local', players: 2, difficulty: 'smart' } as const;
describe('interactive match lifecycle', () => {
  it('does not save a delayed roll after its screen is abandoned', async () => {
    let resolveRoll!: (value: number) => void;
    mockRandom.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRoll = resolve;
        }),
    );
    const { result, unmount } = await renderHook(() => useMatch(local, false, false));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    await act(() => {
      result.current.roll();
    });
    await unmount();
    await act(() => {
      resolveRoll(6);
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    mockLoad.mockResolvedValue(null);
    mockRandom.mockResolvedValue(6);
  });
  it('waits for a human roll, ignores double taps, and persists the selected move', async () => {
    const { result } = await renderHook(() => useMatch(local, false, false));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    expect(mockRandom).not.toHaveBeenCalled();
    await act(() => {
      result.current.roll();
      result.current.roll();
    });
    await waitFor(() => expect(result.current.moves).toHaveLength(4));
    expect(mockRandom).toHaveBeenCalledTimes(1);
    await act(() => {
      result.current.move(result.current.moves[0]!);
    });
    await waitFor(() =>
      expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(1),
    );
    expect(mockSave.mock.calls.at(-1)?.[0].state.lastRoll).toBeNull();
    expect(result.current.match?.state.currentPlayerIndex).toBe(0);
  });
  it('does not roll while paused', async () => {
    const { result } = await renderHook(() => useMatch(local, false, true));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    await act(() => {
      result.current.roll();
    });
    expect(mockRandom).not.toHaveBeenCalled();
  });
  it('restores a pending roll without rolling again', async () => {
    const m = newMatch(local);
    mockLoad.mockResolvedValue({
      ...m,
      lastDie: 6,
      state: { ...m.state, lastRoll: 6, consecutiveSixes: 1 },
    });
    const { result } = await renderHook(() => useMatch(local, true, false));
    await waitFor(() => expect(result.current.moves).toHaveLength(4));
    expect(mockRandom).not.toHaveBeenCalled();
    expect(result.current.match?.id).toBe(m.id);
  });
  it('keeps the last committed state when persistence fails', async () => {
    const { result } = await renderHook(() => useMatch(local, false, false));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    mockSave.mockRejectedValueOnce(new Error('Storage unavailable'));
    await act(() => {
      result.current.roll();
    });
    await waitFor(() => expect(result.current.error).toBe('Storage unavailable'));
    expect(result.current.match?.state.lastRoll).toBeNull();
    expect(result.current.busy).toBe(false);
    await act(() => {
      result.current.roll();
    });
    await waitFor(() => expect(result.current.moves).toHaveLength(4));
  });
});
