import * as Haptics from 'expo-haptics';
import type { IHaptics } from '@/domain/ports/IHaptics';

export class ExpoHaptics implements IHaptics {
  tick(): void {
    void Haptics.selectionAsync().catch(() => undefined);
  }
  tap(): void {
    impact(Haptics.ImpactFeedbackStyle.Light);
  }
  pop(): void {
    impact(Haptics.ImpactFeedbackStyle.Rigid);
  }
  thump(): void {
    impact(Haptics.ImpactFeedbackStyle.Soft);
  }
  delight(): void {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }
}

// Never awaited and never thrown: feedback must not slow or break a toy.
function impact(style: Haptics.ImpactFeedbackStyle): void {
  void Haptics.impactAsync(style).catch(() => undefined);
}
