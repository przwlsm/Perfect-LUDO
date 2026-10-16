/**
 * Opt-in rewarded video ads. Every placement is a button the player taps;
 * nothing ever interrupts a toy. `supported()` is false in builds without the
 * native ads module (Expo Go, web) or without a configured ad unit, and
 * callers hide the button then.
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
   * Starts consent gathering and SDK setup in the background. Call it only
   * when the player opens an offer for a video, so nobody who never wants
   * one is ever asked. Safe to call more than once.
   */
  prepare(): void;
  /** True where the player must be able to revisit their ad privacy choices. */
  privacyOptionsRequired(): Promise<boolean>;
  /** Opens the ad privacy choices form. Never rejects. */
  showPrivacyOptions(): Promise<void>;
}
