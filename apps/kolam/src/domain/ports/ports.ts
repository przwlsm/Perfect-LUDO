// The ports every DevMinds app shares come from app-kit; Kolam adds a text sharer.
export type {
  IHaptics,
  IImageSharer,
  IKeyValueStore,
  IReviewPrompt,
  IRewardedAdsService,
  ISoundPlayer,
  IStoreBilling,
} from 'app-kit';
export { SILENT_HAPTICS, silentSounds } from 'app-kit';

/** Hands a short text (a daily result) to the system share sheet. */
export interface ITextSharer {
  /** 'shared', 'copied' (a browser without a share sheet) or 'failed'. Never rejects. */
  shareText(text: string): Promise<'shared' | 'copied' | 'failed'>;
}

/**
 * The app's sound effects, synthesized by scripts/generate-sounds.mjs:
 * a UI tap, a drawn segment, a cross, an erase, the hint shimmer and the
 * chime cascade when the kolam blooms.
 */
export type SoundCue = 'tap' | 'segment' | 'cross' | 'erase' | 'hint' | 'solve';
