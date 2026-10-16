import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';
import { appVersionRepository, preferencesStore } from '@/config/container';
import { evaluateVersionPolicy, type UpdateRequirement, type VersionPolicy } from '@/domain';
import { PREFERENCE_KEYS } from '../preferenceKeys';

/** Foreground re-checks are rate-limited; a launch always checks. */
const RECHECK_INTERVAL_MS = 30 * 60 * 1000;

/** OTA only works in release builds that are linked to an EAS project. */
const otaEnabled = Updates.isEnabled && !__DEV__;

export type OtaCheckResult = 'up-to-date' | 'downloaded' | 'unavailable' | 'failed';

interface AppUpdateContextValue {
  /** The installed store version, e.g. "1.2.0"; null where the platform has none. */
  readonly installedVersion: string | null;
  /** Identifies the running over-the-air update, for support and the Settings screen. */
  readonly updateLabel: string | null;
  readonly requirement: UpdateRequirement;
  readonly policy: VersionPolicy | null;
  /** An optional store update the player has not dismissed. */
  readonly offerStoreUpdate: boolean;
  dismissStoreUpdate(): void;
  /** Null when there is no store page to open (e.g. iOS without a configured link). */
  readonly openStore: (() => Promise<void>) | null;
  /** Re-fetches the policy and resolves with the resulting requirement. */
  recheckStore(): Promise<UpdateRequirement>;
  /** An over-the-air update has been downloaded and applies on restart. */
  readonly otaReady: boolean;
  applyOta(): Promise<void>;
  checkOta(): Promise<OtaCheckResult>;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

const installedVersion = Application.nativeApplicationVersion;
const platform = Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : null;

function storeLinks(policy: VersionPolicy | null): string[] {
  if (policy?.storeUrl) return [policy.storeUrl];
  const id = Application.applicationId;
  if (Platform.OS === 'android' && id) {
    // The Play Store app first; the web page if it is missing (e.g. some tablets).
    return [`market://details?id=${id}`, `https://play.google.com/store/apps/details?id=${id}`];
  }
  return [];
}

function fetchPolicy(): Promise<VersionPolicy | null> {
  return appVersionRepository && platform
    ? appVersionRepository.fetchPolicy(platform)
    : Promise.resolve(null);
}

async function fetchAndStageOta(): Promise<OtaCheckResult> {
  if (!otaEnabled) return 'unavailable';
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (!isAvailable) return 'up-to-date';
    const { isNew } = await Updates.fetchUpdateAsync();
    return isNew ? 'downloaded' : 'up-to-date';
  } catch {
    return 'failed';
  }
}

/**
 * Keeps players on a working build, two ways:
 *  - store versions: the server's minimum/newest versions decide whether an
 *    update is forced, offered, or not needed (native changes need the store);
 *  - over-the-air updates: JavaScript fixes download in the background and
 *    apply on restart; the player is offered a restart when not mid-game.
 * Both re-check when the app returns to the foreground, at most every 30 min.
 */
export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<VersionPolicy | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const { isUpdatePending, currentlyRunning } = Updates.useUpdates();
  const lastCheck = useRef(0);
  const known = useRef<VersionPolicy | null>(null);

  // A failed fetch (null) keeps the last known policy rather than lifting a block.
  const applyPolicy = useCallback((next: VersionPolicy | null) => {
    if (next) {
      known.current = next;
      setPolicy(next);
    }
    return evaluateVersionPolicy(installedVersion, known.current);
  }, []);

  const recheckStore = useCallback(() => fetchPolicy().then(applyPolicy), [applyPolicy]);

  useEffect(() => {
    void preferencesStore
      .getItem(PREFERENCE_KEYS.UPDATE_DISMISSED_VERSION)
      .then(setDismissed)
      .catch(() => undefined);
    // The launch itself already checks for OTA (checkAutomatically: ON_LOAD).
    lastCheck.current = Date.now();
    void fetchPolicy().then(applyPolicy);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active' || Date.now() - lastCheck.current < RECHECK_INTERVAL_MS) return;
      lastCheck.current = Date.now();
      void fetchPolicy().then(applyPolicy);
      void fetchAndStageOta();
    });
    return () => subscription.remove();
  }, [applyPolicy]);

  const requirement = evaluateVersionPolicy(installedVersion, policy);

  const openStore = useCallback(async () => {
    for (const url of storeLinks(policy)) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Try the next link.
      }
    }
  }, [policy]);

  const dismissStoreUpdate = useCallback(() => {
    const version = policy?.latestVersion ?? null;
    setDismissed(version);
    if (version) {
      void preferencesStore
        .setItem(PREFERENCE_KEYS.UPDATE_DISMISSED_VERSION, version)
        .catch(() => undefined);
    }
  }, [policy?.latestVersion]);

  const applyOta = useCallback(async () => {
    if (!otaEnabled) return;
    try {
      await Updates.reloadAsync();
    } catch {
      // Still applies on the next launch.
    }
  }, []);

  const updateLabel = currentlyRunning.isEmbeddedLaunch
    ? null
    : (currentlyRunning.updateId?.slice(0, 8) ?? null);

  return (
    <AppUpdateContext.Provider
      value={{
        installedVersion,
        updateLabel,
        requirement,
        policy,
        offerStoreUpdate: requirement === 'OPTIONAL' && dismissed !== policy?.latestVersion,
        dismissStoreUpdate,
        openStore: storeLinks(policy).length > 0 ? openStore : null,
        recheckStore,
        otaReady: otaEnabled && isUpdatePending,
        applyOta,
        checkOta: fetchAndStageOta,
      }}
    >
      {children}
    </AppUpdateContext.Provider>
  );
}

export function useAppUpdate(): AppUpdateContextValue {
  const value = useContext(AppUpdateContext);
  if (!value) throw new Error('AppUpdateProvider is required.');
  return value;
}
