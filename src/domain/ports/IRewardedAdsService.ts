/**
 * Opt-in rewarded video ads. Every placement is a button the player taps;
 * nothing ever interrupts play. `supported()` is false in builds without the
 * native ads module (Expo Go), and callers hide the button then.
 */
export interface IRewardedAdsService {
  supported(): boolean;
  /**
   * Loads and shows one rewarded ad. Resolves `true` only when the network
   * confirmed the finished view; `false` for a closed, failed or unavailable
   * ad. Never rejects.
   */
  show(): Promise<boolean>;
}
