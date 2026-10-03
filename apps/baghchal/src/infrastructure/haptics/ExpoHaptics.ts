import * as Haptics from 'expo-haptics';
import type { IHaptics } from '@/domain/ports/IHaptics';

export class ExpoHaptics implements IHaptics {
  select(): void {
    fire(Haptics.ImpactFeedbackStyle.Light);
  }
  drop(): void {
    fire(Haptics.ImpactFeedbackStyle.Medium);
  }
  capture(): void {
    fire(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

// Never awaited and never thrown: feedback must not slow or break a move.
function fire(style: Haptics.ImpactFeedbackStyle): void {
  void Haptics.impactAsync(style).catch(() => undefined);
}
