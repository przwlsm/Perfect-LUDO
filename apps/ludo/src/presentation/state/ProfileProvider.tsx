import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  accountProfiles,
  authProvider,
  connectivityService,
  profileService,
  userProgressRepository,
} from '@/config/container';
import { WALLET_STALE_WARNING, type WalletState } from '@/application/auth/AccountProfiles';
import { pushDisplayName } from '@/application/use-cases/SyncProfileUseCase';
import { INITIAL_PROFILE, type Profile } from '@/application/store/ProfileService';
import {
  NO_STATS,
  SignInRequiredError,
  WalletRefusedError,
  type AuthUser,
  type MatchStats,
  type WalletSnapshot,
} from '@/domain';
import { getBoardTheme, themeForScheme } from '../theme/themes';
import { useAppearance } from '../theme/AppearanceProvider';
import { i18n } from '../i18n';
import { getCosmetic } from '@/domain/cosmetics/catalog';

interface ProfileContextValue {
  profile: Profile;
  ready: boolean;
  error: string | null;
  syncWarning: string | null;
  /** Signed in with a real account (not a guest): coins and the store apply. */
  member: boolean;
  /**
   * `ready` when the coins on screen are the account's current balance,
   * `stale` when the account could not be reached (spending is off until it
   * can), `none` when there is no account wallet to show at all.
   */
  wallet: WalletState;
  reload(): Promise<void>;
  /** Re-reads the account wallet and delivers queued match results. */
  refreshWallet(): Promise<void>;
  perform(action: () => Promise<Profile>): Promise<void>;
  purchase(id: string): Promise<void>;
  equip(id: string): Promise<void>;
  claimGift(): Promise<void>;
  /** The comeback rescue: once a day while nearly broke. Members only. */
  claimRescue(): Promise<void>;
  /** Buys a look for a friend, charging this account. Members only. */
  giftItem(toUserId: string, id: string): Promise<void>;
  /** Pays the guest vault onto the signed-in account, once ever. */
  claimVault(): Promise<void>;
  /** A guest's watch-an-ad vault bonus (device-side, capped per day). */
  claimGuestAd(): Promise<void>;
  /** A guest's online placement prize, into the vault, once per match. */
  creditGuestVault(matchId: string, coins: number): Promise<void>;
  /** A guest tries a paid board for a day after a rewarded ad. */
  startTrial(boardId: string): Promise<void>;
  /** Resolves `true` when the result reached the account, `false` when it was queued for later. */
  recordMatch(
    id: string,
    won: boolean,
    rewardEligible: boolean,
    stats?: MatchStats,
  ): Promise<boolean>;
  /** Collects an online match; the server decides the result. Members only. */
  recordOnlineMatch(matchId: string, stats?: MatchStats): Promise<void>;
  /** Shows a wallet another server call returned (spin, missions, season pass, prizes). */
  adoptWallet(snapshot: WalletSnapshot): Promise<void>;
  /** Accepts an already-persisted profile, e.g. the result of cloud sign-in sync. */
  adoptProfile(profile: Profile): void;
}
const ProfileContext = createContext<ProfileContextValue | null>(null);

type WarningKey = 'walletStale' | 'cloudSyncSignedIn' | 'restoreFailed' | 'cloudSyncUnavailable';
type ErrorKey = 'loadFailed' | 'accountLoadFailed';
/**
 * Held as a key, so a message already on screen follows a language change;
 * `text` is another layer's own message, shown as written.
 */
type Message<K extends string> = { readonly key: K } | { readonly text: string };

/** `AccountProfiles` reports in English; known warnings map to catalogue keys. */
const ACTIVATION_WARNINGS: Readonly<Record<string, WarningKey>> = {
  [WALLET_STALE_WARNING]: 'walletStale',
  'Signed in. Cloud sync is unavailable; your progress is saved on this device.':
    'cloudSyncSignedIn',
};
const warningFrom = (text: string | null): Message<WarningKey> | null =>
  text === null ? null : ACTIVATION_WARNINGS[text] ? { key: ACTIVATION_WARNINGS[text] } : { text };

const sessionKey = (user: AuthUser | null) => (user ? `${user.uid}:${user.isGuest}` : '');
const isMember = (user: AuthUser | null) => user !== null && !user.isGuest;

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [ready, setReady] = useState(false);
  const { t } = useTranslation('account');
  const [error, setError] = useState<Message<ErrorKey> | null>(null);
  const [syncWarning, setSyncWarning] = useState<Message<WarningKey> | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => authProvider?.getCurrentUser() ?? null);
  const [wallet, setWallet] = useState<WalletState>('none');
  const switching = useRef(true);
  const cloudReady = useRef(false);
  const pushQueue = useRef<Promise<void>>(Promise.resolve());
  const pushedName = useRef<string | null>(null);
  const refreshing = useRef(false);
  const latest = useRef({ profile, wallet, user });
  latest.current = { profile, wallet, user };

  const currentKey = () => sessionKey(authProvider?.getCurrentUser() ?? null);

  function adopt(result: { profile: Profile; warning: string | null; wallet: WalletState }) {
    setProfile(result.profile);
    setSyncWarning(warningFrom(result.warning));
    setWallet(result.wallet);
    cloudReady.current = !result.warning || result.wallet !== 'none';
    pushedName.current = result.profile.name;
  }

  async function reload() {
    try {
      switching.current = true;
      const current = authProvider?.getCurrentUser() ?? null;
      setUser(current);
      adopt(await accountProfiles.activate(current?.uid ?? null, current?.isGuest ?? false));
      switching.current = false;
      setReady(true);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? { text: e.message } : { key: 'loadFailed' });
    }
  }
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    let lastKey: string | undefined;
    const activate = (next: AuthUser | null) => {
      const key = sessionKey(next);
      if (cancelled || key === lastKey) return;
      lastKey = key;
      const ticket = ++generation;
      switching.current = true;
      setReady(false);
      setUser(next);
      void accountProfiles
        .activate(next?.uid ?? null, next?.isGuest ?? false)
        .then((result) => {
          if (cancelled || ticket !== generation) return;
          adopt(result);
          setError(null);
          switching.current = false;
          setReady(true);
        })
        .catch(() => {
          if (cancelled || ticket !== generation) return;
          setError({ key: 'accountLoadFailed' });
        });
    };
    const unsubscribe = authProvider?.onAuthStateChanged((next) => {
      // Defer cloud requests until Supabase releases its authentication lock.
      setTimeout(() => activate(next), 0);
    });
    if (authProvider) {
      void authProvider
        .restoreSession()
        .then((next) => activate(next))
        .catch(() => {
          activate(null);
          setSyncWarning({ key: 'restoreFailed' });
        });
    } else activate(null);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  /**
   * Re-reads the account wallet when the app comes back to the foreground
   * or the server becomes reachable again, but only when there is something
   * to catch up on: a stale balance or results still waiting to be paid.
   */
  useEffect(() => {
    const catchUp = () => {
      const { profile: p, wallet: w, user: u } = latest.current;
      if (!isMember(u) || switching.current) return;
      if (w === 'stale' || p.pendingRewards.length > 0) void refreshWallet();
    };
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') catchUp();
    });
    const unsubscribe = connectivityService?.subscribe((state) => {
      if (state === 'ONLINE') catchUp();
    });
    return () => {
      appState.remove();
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Runs a local profile change and shows its result, unless the account changed meanwhile. */
  async function perform(action: () => Promise<Profile>) {
    if (!ready || switching.current) throw new Error(i18n.t('account:profileState.stillLoading'));
    const owner = currentKey();
    const next = await action();
    if (switching.current || owner !== currentKey()) return;
    setProfile(next);
    if (next.name !== pushedName.current) void syncName(next);
  }

  /**
   * Best-effort push of the display name to the signed-in account.
   * Deliberately not awaited and never throws: the device copy is already
   * saved, so a flaky network must not fail a settings change.
   */
  function syncName(next: Profile) {
    const uid = authProvider?.getCurrentUser()?.uid;
    if (!uid || !userProgressRepository || !cloudReady.current || switching.current)
      return Promise.resolve();
    const repository = userProgressRepository;
    const task = pushQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (switching.current || uid !== authProvider?.getCurrentUser()?.uid) return;
        try {
          await pushDisplayName(repository, uid, next);
          pushedName.current = next.name;
        } catch {
          if (uid === authProvider?.getCurrentUser()?.uid)
            setSyncWarning({ key: 'cloudSyncUnavailable' });
        }
      });
    pushQueue.current = task;
    return task;
  }

  function memberWallet() {
    if (!isMember(authProvider?.getCurrentUser() ?? null)) throw new SignInRequiredError();
    const account = accountProfiles.memberWallet();
    if (!account) throw new Error(i18n.t('account:profileState.storeUnavailable'));
    return account;
  }

  async function refreshWallet() {
    if (refreshing.current || switching.current) return;
    let account: ReturnType<typeof memberWallet>;
    try {
      account = memberWallet();
    } catch {
      return;
    }
    refreshing.current = true;
    const owner = currentKey();
    try {
      const next = await account.refresh();
      if (owner !== currentKey() || switching.current) return;
      setProfile(next);
      setWallet('ready');
      setSyncWarning((w) => (w && 'key' in w && w.key === 'walletStale' ? null : w));
    } catch {
      if (owner !== currentKey() || switching.current) return;
      setWallet('stale');
      setSyncWarning({ key: 'walletStale' });
    } finally {
      refreshing.current = false;
    }
  }

  /** Server first, mirror second; a refusal re-reads the wallet so a stale balance corrects itself. */
  async function spend(action: (account: ReturnType<typeof memberWallet>) => Promise<Profile>) {
    const account = memberWallet();
    try {
      await perform(() => action(account));
      setWallet('ready');
    } catch (e) {
      if (e instanceof WalletRefusedError) void refreshWallet();
      throw e;
    }
  }

  async function purchase(id: string) {
    await spend((account) => account.purchase(id));
  }
  async function claimGift() {
    await spend((account) => account.claimGift());
  }
  async function claimRescue() {
    await spend((account) => account.claimRescue());
  }
  async function giftItem(toUserId: string, id: string) {
    await spend((account) => account.gift(toUserId, id));
  }
  async function claimVault() {
    await spend((account) => account.claimVault());
  }
  async function claimGuestAd() {
    await perform(() => profileService.claimVaultAd());
  }
  async function creditGuestVault(matchId: string, coins: number) {
    await perform(() => profileService.creditVaultOnce(`online:${matchId}`, coins));
  }
  async function startTrial(boardId: string) {
    await perform(() => profileService.startTrial(boardId));
  }
  async function equip(id: string) {
    await perform(() => profileService.equip(id));
  }
  async function recordMatch(
    id: string,
    won: boolean,
    rewardEligible: boolean,
    stats: MatchStats = NO_STATS,
  ) {
    if (!isMember(authProvider?.getCurrentUser() ?? null) || !accountProfiles.memberWallet()) {
      // Coins are an account feature: guests keep their stats, not a reward.
      await perform(() => profileService.recordMatch(id, won, false));
      return true;
    }
    let delivered = true;
    await perform(async () => {
      const next = await memberWallet().recordMatch(id, won, rewardEligible, stats);
      delivered = !next.pendingRewards.some((r) => r.matchId === id);
      return next;
    });
    setWallet(delivered ? 'ready' : 'stale');
    return delivered;
  }

  async function recordOnlineMatch(matchId: string, stats: MatchStats = NO_STATS) {
    if (!isMember(authProvider?.getCurrentUser() ?? null) || !accountProfiles.memberWallet())
      return;
    await perform(() => memberWallet().recordOnlineMatch(matchId, stats));
    setWallet('ready');
  }

  async function adoptWallet(snapshot: WalletSnapshot) {
    const account = accountProfiles.memberWallet();
    if (!account) return;
    await perform(() => account.adopt(snapshot));
    setWallet('ready');
  }

  function adoptProfile(next: Profile) {
    setProfile(next);
    setReady(true);
    setError(null);
  }
  return (
    <ProfileContext.Provider
      value={{
        profile,
        ready,
        error: error && ('text' in error ? error.text : t(`profileState.${error.key}`)),
        syncWarning:
          syncWarning &&
          ('text' in syncWarning ? syncWarning.text : t(`profileState.${syncWarning.key}`)),
        member: isMember(user),
        wallet,
        reload,
        refreshWallet,
        perform,
        purchase,
        equip,
        claimGift,
        claimRescue,
        giftItem,
        claimVault,
        claimGuestAd,
        creditGuestVault,
        startTrial,
        recordMatch,
        recordOnlineMatch,
        adoptWallet,
        adoptProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider is required.');
  const { scheme } = useAppearance();
  // A running ad trial dresses the whole app in the borrowed board.
  const trial =
    value.profile.trialBoard !== null &&
    value.profile.trialUntil !== null &&
    new Date(value.profile.trialUntil).getTime() > new Date().getTime() &&
    !value.profile.owned.includes(value.profile.trialBoard)
      ? value.profile.trialBoard
      : null;
  const boardTheme = getBoardTheme(trial ?? value.profile.board);
  const packTheme = themeForScheme(
    value.profile.pack
      ? getBoardTheme(getCosmetic(value.profile.pack).contents!.board)
      : boardTheme,
    scheme,
  );
  return {
    ...value,
    boardTheme,
    theme: {
      ...boardTheme,
      background: packTheme.background,
      surface: packTheme.surface,
      accent: packTheme.accent,
      accentText: packTheme.accentText,
    },
  };
}
