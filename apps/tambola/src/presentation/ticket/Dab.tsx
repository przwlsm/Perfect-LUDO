import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { Dabber } from '@/domain/entities/Look';

interface DabProps {
  readonly dabber: Dabber;
  readonly size: number;
  /** Stamp in with a bounce (a fresh daub) or just appear (restored, calm motion). */
  readonly animate: boolean;
  /** A slight per-number tilt so a row of daubs looks hand-stamped. */
  readonly tilt: number;
}

/** The ink a dabber leaves: stamped in with a squash, a bounce and a ripple. */
export function Dab({ dabber, size, animate, tilt }: DabProps) {
  const press = useSharedValue(animate ? 0 : 1);
  const ripple = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    press.set(withSpring(1, { damping: 9, stiffness: 320, mass: 0.6 }));
    ripple.set(withTiming(1, { duration: 520 }));
  }, [animate, press, ripple]);
  const stamp = useAnimatedStyle(() => {
    const p = press.get();
    return {
      opacity: Math.min(1, p * 1.6),
      transform: [{ scale: 1.7 - 0.7 * p }, { rotate: `${tilt}deg` }],
    };
  });
  const ring = useAnimatedStyle(() => ({
    opacity: (1 - ripple.get()) * 0.55,
    transform: [{ scale: 0.8 + ripple.get() * 0.7 }],
  }));
  const d = size * 0.86;
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ripple,
            { width: d, height: d, borderRadius: d / 2, borderColor: dabber.color },
            ring,
          ]}
        />
        <Animated.View style={[styles.stamp, stamp]}>
          <Shape dabber={dabber} d={d} />
        </Animated.View>
      </View>
    </View>
  );
}

function Shape({ dabber, d }: { dabber: Dabber; d: number }) {
  switch (dabber.shape) {
    case 'dot':
      return (
        <View
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: dabber.color,
            opacity: 0.94,
          }}
        />
      );
    case 'ring':
      return (
        <View
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: Math.max(3, d * 0.11),
            borderColor: dabber.color,
          }}
        />
      );
    case 'star':
      return <Ionicons name="star" size={d * 1.22} color={dabber.color} />;
    case 'heart':
      return <Ionicons name="heart" size={d * 1.2} color={dabber.color} />;
    case 'flower':
      return <Ionicons name="flower" size={d * 1.16} color={dabber.color} />;
  }
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stamp: { alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', borderWidth: 2 },
});
