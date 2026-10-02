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
  it('automatically moves the only legal coin after a human rolls', async () => {
    const m = newMatch(local);
    mockLoad.mockResolvedValue({
      ...m,
      state: {
        ...m.state,
        players: m.state.players.map((p, i) =>
          i
            ? p
            : { ...p, pieces: p.pieces.map((piece, j) => (j ? piece : { ...piece, progress: 1 })) },
        ),
      },
    });
    mockRandom.mockResolvedValue(3);
    const { result } = await renderHook(() => useMatch(local, true, false));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    await act(() => {
      result.current.roll();
    });
    await waitFor(() =>
      expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(4),
    );
    expect(result.current.match?.state.currentPlayerIndex).toBe(1);
    expect(mockRandom).toHaveBeenCalledTimes(1);
  });
  it('leaves a six to the player when exiting the yard is another legal choice', async () => {
    const m = newMatch(local);
    mockLoad.mockResolvedValue({
      ...m,
      lastDie: 6,
      state: {
        ...m.state,
        lastRoll: 6,
        consecutiveSixes: 1,
        players: m.state.players.map((p, i) =>
          i
            ? p
            : { ...p, pieces: p.pieces.map((piece, j) => (j ? piece : { ...piece, progress: 1 })) },
        ),
      },
    });
    const { result } = await renderHook(() => useMatch(local, true, false));
    await waitFor(() => expect(result.current.moves).toHaveLength(4));
    await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
    expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(1);
  });
  it('does not automatically move while paused', async () => {
    const m = newMatch(local);
    mockLoad.mockResolvedValue({
      ...m,
      lastDie: 3,
      state: {
        ...m.state,
        lastRoll: 3,
        players: m.state.players.map((p, i) =>
          i
            ? p
            : { ...p, pieces: p.pieces.map((piece, j) => (j ? piece : { ...piece, progress: 1 })) },
        ),
      },
    });
    const { result, rerender } = await renderHook(
      ({ paused }: { paused: boolean }) => useMatch(local, true, paused),
      {
        initialProps: { paused: true },
      },
    );
    await waitFor(() => expect(result.current.moves).toHaveLength(1));
    await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
    expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(1);
    await rerender({ paused: false });
    await waitFor(() =>
      expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(4),
    );
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
    expect(result.current.seatRolls).toEqual({ RED: 6 });
    expect(result.current.feedback?.cue).toBe('roll');
    await act(() => {
      result.current.move(result.current.moves[0]!);
    });
    await waitFor(() =>
      expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(1),
    );
    expect(mockSave.mock.calls.at(-1)?.[0].state.lastRoll).toBeNull();
    expect(result.current.match?.state.currentPlayerIndex).toBe(0);
    expect(result.current.feedback?.cue).toBe('enter');
  });
  it('auto-plays the only legal move instead of waiting for a tap', async () => {
    const m = newMatch(local);
    mockLoad.mockResolvedValue({
      ...m,
      state: {
        ...m.state,
        players: [
          {
            ...m.state.players[0]!,
            pieces: [
              { id: 'RED-0', color: 'RED', progress: 10 },
              ...m.state.players[0]!.pieces.slice(1),
            ],
          },
          m.state.players[1]!,
        ],
      },
    });
    // Not a six, so the three pieces still in the yard stay put and the one
    // piece already on the track is the single legal move.
    mockRandom.mockResolvedValue(3);
    const { result } = await renderHook(() => useMatch(local, true, false));
    await waitFor(() => expect(result.current.match).not.toBeNull());

    await act(() => {
      result.current.roll();
    });

    await waitFor(
      () => expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(13),
      { timeout: 5000 },
    );
    // The turn moved on without the player ever calling move().
    expect(result.current.match?.state.currentPlayerIndex).toBe(1);
  });

  /** A saved local match with red's coins at these squares (the rest at home). */
  function savedWithRed(progress: number[]) {
    const m = newMatch(local);
    return {
      ...m,
      state: {
        ...m.state,
        players: [
          {
            ...m.state.players[0]!,
            pieces: m.state.players[0]!.pieces.map((piece, i) => ({
              ...piece,
              progress: progress[i] ?? 0,
            })),
          },
          m.state.players[1]!,
        ],
      },
    };
  }

  it('still waits for a tap when there are genuinely different moves', async () => {
    // A six: the coin on 10 can advance, or a coin can leave home. Two choices.
    mockLoad.mockResolvedValue(savedWithRed([10]));
    mockRandom.mockResolvedValue(6);
    const { result } = await renderHook(() => useMatch(local, true, false));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    await act(() => {
      result.current.roll();
    });
    await waitFor(() => expect(result.current.moves).toHaveLength(4));

    // Well past the auto-play delay: the choice must stay the player's call.
    await new Promise((resolve) => setTimeout(resolve, 1400));
    expect(result.current.match?.state.players[0]?.pieces[0]?.progress).toBe(10);
    expect(result.current.moves).toHaveLength(4);
  });

  it('auto-plays when every playable coin is stacked on the same square', async () => {
    // Two coins on 10 and a roll of 3: either coin makes the same move.
    mockLoad.mockResolvedValue(savedWithRed([10, 10]));
    mockRandom.mockResolvedValue(3);
    const { result } = await renderHook(() => useMatch(local, true, false));
    await waitFor(() => expect(result.current.match).not.toBeNull());
    await act(() => {
      result.current.roll();
    });
    await waitFor(
      () =>
        expect(
          result.current.match?.state.players[0]?.pieces.filter((p) => p.progress === 13),
        ).toHaveLength(1),
      { timeout: 5000 },
    );
    expect(result.current.match?.state.currentPlayerIndex).toBe(1);
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

it('retries an initial storage failure without creating a replacement game', async () => {
  mockLoad
    .mockRejectedValueOnce(new Error('Storage unavailable'))
    .mockResolvedValue(newMatch(local));
  const { result } = await renderHook(() => useMatch(local, true, false));
  await waitFor(() => expect(result.current.error).toBe('Storage unavailable'));
  await act(() => result.current.retry());
  await waitFor(() => expect(result.current.match).not.toBeNull());
});
