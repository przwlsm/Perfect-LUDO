import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

/** Both the player's preference and the device's accessibility setting take precedence. */
export function useMotionEnabled(reducedMotion: boolean, active: boolean): boolean {
  const [systemReduced, setSystemReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setSystemReduced(value);
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    const app = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  return active && foreground && !reducedMotion && !systemReduced;
}
