import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Small looping animations that make the lobby feel alive. Every one takes
 * `active`, and stands perfectly still when motion is off (the player's
 * setting, the system's reduce-motion option, or the screen not in focus).
 */

/** A 0→1→0 loop driven on the UI thread; resets to 0 when inactive. */
function useLoop(active: boolean, duration: number, delay = 0) {
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    if (active)
      t.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true),
      );
    return () => cancelAnimation(t);
  }, [active, duration, delay, t]);
  return t;
}

/** A blinking status dot, e.g. beside LIVE. */
export function LiveDot({
  color,
  size = 8,
  active,
}: {
  color: string;
  size?: number;
  active: boolean;
}) {
  const t = useLoop(active, 700);
  const dot = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 1], [1, 0.25]) }));
  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 2.2]) }],
  }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size,
              backgroundColor: color,
            },
            ring,
          ]}
        />
      )}
      <Animated.View
        style={[{ width: size, height: size, borderRadius: size, backgroundColor: color }, dot]}
      />
    </View>
  );
}

/** Gently breathes its child bigger and smaller: for a call to action. */
export function Pulse({
  active,
  children,
  scale = 1.04,
  style,
}: {
  active: boolean;
  children: ReactNode;
  scale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useLoop(active, 900);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(t.value, [0, 1], [1, scale]) }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Floats its child up and down a few points. */
export function Bob({
  active,
  children,
  distance = 4,
  style,
}: {
  active: boolean;
  children: ReactNode;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useLoop(active, 1400);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, -distance]) }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Turns its child slowly and continuously, like an idle lucky wheel. */
export function Spin({
  active,
  children,
  seconds = 8,
}: {
  active: boolean;
  children: ReactNode;
  seconds?: number;
}) {
  const r = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(r);
    r.value = 0;
    if (active)
      r.value = withRepeat(
        withTiming(360, { duration: seconds * 1000, easing: Easing.linear }),
        -1,
      );
    return () => cancelAnimation(r);
  }, [active, seconds, r]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

/**
 * A soft diagonal highlight that sweeps across its parent every few
 * seconds. Place inside a container with `overflow: 'hidden'`.
 */
export function Shine({
  active,
  width = 400,
  every = 3200,
}: {
  active: boolean;
  width?: number;
  every?: number;
}) {
  const x = useSharedValue(-1);
  useEffect(() => {
    cancelAnimation(x);
    x.value = -1;
    if (active)
      x.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 0 }),
          withDelay(every, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })),
        ),
        -1,
      );
    return () => cancelAnimation(x);
  }, [active, every, x]);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * width }, { rotate: '20deg' }],
  }));
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { alignItems: 'center' }, anim]}
    >
      <LinearGradient
        colors={['#ffffff00', '#ffffff2e', '#ffffff00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: 90, height: '300%', marginTop: '-50%' }}
      />
    </Animated.View>
  );
}
