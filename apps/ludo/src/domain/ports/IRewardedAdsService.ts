/**
 * Opt-in rewarded video ads. Every placement is a button the player taps;
 * nothing ever interrupts play. `supported()` is false in builds without the
 * native ads module (Expo Go) or without a configured ad unit, and callers
 * hide the button then.
 */
export interface IRewardedAdsService {
  supported(): boolean;
  /**
   * Loads and shows one rewarded ad. Resolves `true` only when the network
   * confirmed the finished view; `false` for a closed, failed or unavailable
   * ad. Never rejects.
   */
  show(): Promise<boolean>;
  /**
   * Starts consent gathering and SDK setup in the background, so the
   * consent form (where legally required) appears at launch rather than on
   * the first ad tap. Safe to call more than once.
   */
  prepare(): void;
  /** True where the player must be able to revisit their ad privacy choices. */
  privacyOptionsRequired(): Promise<boolean>;
  /** Opens the ad privacy choices form. Never rejects. */
  showPrivacyOptions(): Promise<void>;
}
