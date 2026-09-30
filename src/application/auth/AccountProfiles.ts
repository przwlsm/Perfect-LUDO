import type { IKeyValueStore, IUserProgressRepository, IWalletRepository } from '@/domain';
import {
  INITIAL_PROFILE,
  parseProfile,
  type IProfileService,
  type Profile,
} from '../store/ProfileService';
import { syncOnSignIn } from '../use-cases/SyncProfileUseCase';
import { MemberWallet } from '../wallet/MemberWallet';

const OWNER = 'ludo.profile-owner.v1';
const snapshotKey = (owner: string | null) => `ludo.account-profile.v1.${owner ?? 'guest'}`;

/**
 * `none`: no account wallet applies (signed out, guest, or offline build).
 * `ready`: the profile mirrors the account wallet the server just returned.
 * `stale`: signed in, but the server could not be reached; the mirror is
 * whatever this device last saw, so spending is off until a refresh works.
 */
export type WalletState = 'none' | 'ready' | 'stale';

export interface ActivatedProfile {
  readonly profile: Profile;
  readonly warning: string | null;
  readonly wallet: WalletState;
}

export const WALLET_STALE_WARNING =
  'Signed in, but your coins could not be loaded. Reconnect and retry from your profile.';

/**
 * How long sign-in waits on the cloud before carrying on with the copy on
 * this device. Offline, a request can otherwise hang until the network
 * stack gives up, and the player would stare at a spinner.
 */
export const CLOUD_WAIT_MS = 5000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The server took too long to answer.')), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Serial account switches preserve guest progress and isolate accounts sharing a device. */
export class AccountProfiles {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly storage: IKeyValueStore,
    private readonly profiles: IProfileService,
    private readonly cloud: IUserProgressRepository | null,
    private readonly wallet: IWalletRepository | null = null,
  ) {}

  /** The member wallet for the signed-in account, when this build has one. */
  memberWallet(): MemberWallet | null {
    return this.wallet ? new MemberWallet(this.profiles, this.wallet) : null;
  }

  activate(uid: string | null, guest = false): Promise<ActivatedProfile> {
    const action = this.queue
      .catch(() => undefined)
      .then(async () => {
        const owner = (await this.storage.getItem(OWNER)) || null;
        let local = await this.profiles.load();
        if (owner !== uid) {
          await this.storage.setItem(snapshotKey(owner), JSON.stringify(local));
          const saved = await this.storage.getItem(snapshotKey(uid));
          // Guest progress may seed a new account. Account A never seeds account B.
          local = saved
            ? parseProfile(saved)
            : owner === null && uid !== null
              ? local
              : {
                  ...INITIAL_PROFILE,
                  reducedMotion: local.reducedMotion,
                  soundEnabled: local.soundEnabled,
                };
        }
        let warning: string | null = null;
        // One budget for every cloud call below, not one each.
        const deadline = Date.now() + CLOUD_WAIT_MS;
        const remaining = () => Math.max(500, deadline - Date.now());
        if (uid && this.cloud) {
          try {
            local = await withTimeout(syncOnSignIn(this.cloud, uid, local), remaining());
          } catch {
            warning =
              'Signed in. Cloud sync is unavailable; your progress is saved on this device.';
          }
        }
        let profile = await this.profiles.replace(local);
        // Empty string represents the guest because the storage port has no remove operation.
        await this.storage.setItem(OWNER, uid ?? '');
        let wallet: WalletState = 'none';
        const member = uid !== null && !guest ? this.memberWallet() : null;
        if (member) {
          try {
            profile = await withTimeout(member.refresh(), remaining());
            wallet = 'ready';
          } catch {
            wallet = 'stale';
            warning = WALLET_STALE_WARNING;
          }
        }
        return { profile, warning, wallet };
      });
    this.queue = action;
    return action;
  }
}
