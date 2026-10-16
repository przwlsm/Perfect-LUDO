// Pure, platform-free parts of app-kit. Native adapters live in `app-kit/native`.
export * from './color';
export * from './money/Entitlements';
export * from './money/Products';
export * from './progress/progress';
export * from './random';
export type { IHaptics } from './ports/IHaptics';
export { SILENT_HAPTICS } from './ports/IHaptics';
export type { IImageSharer } from './ports/IImageSharer';
export type { IKeyValueStore } from './ports/IKeyValueStore';
export type { IReviewPrompt } from './ports/IReviewPrompt';
export type { IRewardedAdsService } from './ports/IRewardedAdsService';
export type { ISoundPlayer } from './ports/ISoundPlayer';
export { silentSounds } from './ports/ISoundPlayer';
export type { IStoreBilling } from './ports/IStoreBilling';
