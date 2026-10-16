import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { getTableGift, type TableGiftId } from '@/domain';
import { Text } from '../components/AppText';

/** A point on the table in the overlay's own coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The flight: a rise, a hang in the air, then the drop onto the target. */
const FLY_MS = 900;
/** The splash after landing: the burst and the shake. */
const SPLASH_MS = 1100;

/** How each gift bursts when it lands. */
const SPLASH: Record<TableGiftId, { readonly bits: readonly string[]; readonly spin: number }> = {
  rose: { bits: ['🌸', '🌹', '💗', '🌸', '💮', '🌹', '💗', '🌸'], spin: 160 },
  punch: { bits: ['💥', '⭐', '💫', '⭐', '💥', '💫', '⭐', '💥'], spin: 40 },
  laugh: { bits: ['😂', '🤣', '😆', '🤣', '😂', '😆', '🤣', '😂'], spin: 90 },
  crown: { bits: ['✨', '👑', '✨', '💎', '✨', '👑', '💎', '✨'], spin: 120 },
};

/**
 * One gift flying across the table. It lifts off at `from`, arcs over the
 * board and lands on `to`, where it bursts. The burst and the gift token
 * are the only things drawn here; the landing shake belongs to the target
 * panel (GameTable passes it a `hit` tick).
 */
export function GiftFlight({
  gift,
  from,
  to,
  motionEnabled,
  onLand,
}: {
  gift: TableGiftId;
  from: Point;
  to: Point;
  motionEnabled: boolean;
  onLand?: () => void;
}) {
  const t = useSharedValue(motionEnabled ? 0 : 1);
  const splash = useSharedValue(0);
  const { emoji } = getTableGift(gift);
  const style = SPLASH[gift];

  useEffect(() => {
    if (motionEnabled) {
      t.set(0);
      t.set(withTiming(1, { duration: FLY_MS, easing: Easing.inOut(Easing.quad) }));
      splash.set(0);
      splash.set(
        withDelay(FLY_MS, withTiming(1, { duration: SPLASH_MS, easing: Easing.out(Easing.cubic) })),
      );
    } else {
      t.set(1);
      splash.set(withTiming(1, { duration: SPLASH_MS }));
    }
    const land = setTimeout(() => onLand?.(), motionEnabled ? FLY_MS : 0);
    return () => clearTimeout(land);
    // The flight plays once per mount; a new gift is a new component (keyed by id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The arc peaks a third of the way up the screen above the straight line.
  const lift = Math.max(90, Math.abs(to.y - from.y) * 0.45 + 60);
  const token = useAnimatedStyle(() => {
    const p = t.get();
    const x = from.x + (to.x - from.x) * p;
    const y = from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * lift;
    // Grows on take-off, shrinks into the landing, then vanishes with the splash.
    const scale = interpolate(p, [0, 0.35, 1], [0.6, 1.5, 1]) * (1 - splash.get() * 0.9);
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${p * 360 * (style.spin / 120)}deg` },
        { scale },
      ],
      opacity: p === 1 && splash.get() > 0.6 ? 0 : 1,
    };
  });

  const bits = useMemo(
    () =>
      style.bits.map((bit, i) => {
        const angle = (i / style.bits.length) * Math.PI * 2 - Math.PI / 2;
        return { bit, dx: Math.cos(angle), dy: Math.sin(angle), delay: (i % 3) * 40 };
      }),
    [style],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => (
        <SplashBit
          key={i}
          bit={b.bit}
          dx={b.dx}
          dy={b.dy}
          delay={b.delay}
          at={to}
          splash={splash}
        />
      ))}
      <Animated.View style={[styles.token, token]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>
    </View>
  );
}

function SplashBit({
  bit,
  dx,
  dy,
  delay,
  at,
  splash,
}: {
  bit: string;
  dx: number;
  dy: number;
  delay: number;
  at: Point;
  splash: { get(): number };
}) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, (splash.get() * SPLASH_MS - delay) / (SPLASH_MS - delay)));
    const reach = 26 + p * 58;
    return {
      opacity: p === 0 ? 0 : 1 - p * p,
      transform: [
        { translateX: at.x + dx * reach },
        // Bits drift down a little as they fade, like petals.
        { translateY: at.y + dy * reach + p * p * 30 },
        { scale: 0.5 + p * 0.9 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.bit, style]}>
      <Text style={styles.bitText}>{bit}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  token: {
    position: 'absolute',
    left: -24,
    top: -24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 38 },
  bit: {
    position: 'absolute',
    left: -12,
    top: -12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bitText: { fontSize: 18 },
});
