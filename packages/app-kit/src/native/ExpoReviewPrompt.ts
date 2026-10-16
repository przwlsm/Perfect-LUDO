import * as StoreReview from 'expo-store-review';
import type { IReviewPrompt } from '../ports/IReviewPrompt';

export class ExpoReviewPrompt implements IReviewPrompt {
  async request(): Promise<void> {
    try {
      if (await StoreReview.hasAction()) await StoreReview.requestReview();
    } catch {
      // The store said no or is missing; asking is never essential.
    }
  }
}
