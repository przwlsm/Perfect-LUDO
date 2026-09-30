import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { rewardsRepository } from '@/config/container';
import type {
  AdRewardKind,
  LeagueView,
  RewardsSnapshot,
  SpinResult,
  TournamentView,
} from '@/domain';
import { useProfile } from '../state/ProfileProvider';

const message = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';

/**
 * Daily spin, missions and the season pass for the signed-in member. Loads
 * whenever the screen comes into focus, and every action shows the server's
 * answer (including the new balance) straight away.
 */
export function useRewards() {
  const { member, adoptWallet } = useProfile();
  const [data, setData] = useState<RewardsSnapshot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  // The context recreates this every render; reading it through a ref keeps
  // `load` stable, so focusing the screen loads once instead of looping.
  const adoptRef = useRef(adoptWallet);
  useEffect(() => {
    adoptRef.current = adoptWallet;
  }, [adoptWallet]);

  const load = useCallback(async () => {
    if (!member || !rewardsRepository) return;
    try {
      const next = await rewardsRepository.getRewards();
      if (!alive.current) return;
      setData(next);
      setError(null);
      await adoptRef.current(next.wallet);
    } catch (e) {
      if (alive.current) setError(message(e));
    }
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Runs one action at a time; `key` names it so its button can show progress. */
  async function run<T>(
    key: string,
    action: () => Promise<T>,
    apply: (result: T) => Promise<void>,
  ) {
    if (busy || !rewardsRepository) return null;
    setBusy(key);
    setError(null);
    try {
      const result = await action();
      if (alive.current) await apply(result);
      return result;
    } catch (e) {
      if (alive.current) setError(message(e));
      return null;
    } finally {
      if (alive.current) setBusy(null);
    }
  }

  const adopt = async (next: RewardsSnapshot) => {
    setData(next);
    await adoptWallet(next.wallet);
  };

  return {
    available: member && rewardsRepository !== null,
    data,
    busy,
    error,
    reload: load,
    spin: () =>
      run<SpinResult>(
        'spin',
        () => rewardsRepository!.spin(),
        async (result) => {
          await adoptWallet(result.wallet);
          // Refresh missions (the spin mission) and the spin count behind the wheel.
          void load();
        },
      ),
    claimMission: (id: string) =>
      run(`mission:${id}`, () => rewardsRepository!.claimMission(id), adopt),
    buyPremium: () => run('premium', () => rewardsRepository!.buySeasonPremium(), adopt),
    claimTier: (tier: number, premium: boolean) =>
      run(
        `tier:${tier}:${premium}`,
        () => rewardsRepository!.claimSeasonTier(tier, premium),
        adopt,
      ),
    claimAdReward: (kind: AdRewardKind) =>
      run(
        `ad:${kind}`,
        () => rewardsRepository!.claimAdReward(kind),
        async (wallet) => {
          await adoptWallet(wallet);
          // Refresh the ad counts behind the buttons.
          void load();
        },
      ),
  };
}

/**
 * The player's league standing. Loading it settles a finished week on the
 * server, so a settlement that paid gems refreshes the wallet too.
 */
export function useLeague() {
  const { member, refreshWallet } = useProfile();
  const [data, setData] = useState<LeagueView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef(refreshWallet);
  useEffect(() => {
    refreshRef.current = refreshWallet;
  }, [refreshWallet]);

  const load = useCallback(async () => {
    if (!member || !rewardsRepository) return;
    try {
      const next = await rewardsRepository.getLeague();
      setData(next);
      setError(null);
      if (next.lastResult && next.lastResult.gems > 0) await refreshRef.current();
    } catch (e) {
      setError(message(e));
    }
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { data, error, reload: load };
}

/** The weekly tournament leaderboard, with last week's prize to collect. */
export function useTournament() {
  const { member, refreshWallet } = useProfile();
  const [data, setData] = useState<TournamentView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!member || !rewardsRepository) return;
    try {
      setData(await rewardsRepository.getTournament());
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function claim() {
    if (busy || !rewardsRepository) return;
    setBusy(true);
    setError(null);
    try {
      setData(await rewardsRepository.claimTournamentPrize());
      await refreshWallet();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  return {
    available: member && rewardsRepository !== null,
    data,
    busy,
    error,
    reload: load,
    claim,
  };
}
