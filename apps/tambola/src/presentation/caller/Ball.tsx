import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Oval,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { columnOf } from '@/domain/entities/Ticket';
import { useSettings } from '../state/SettingsProvider';
import { BALL_COLORS, FONTS } from '../theme/palette';

interface BallProps {
  readonly n: number | null;
  readonly size: number;
  /** An empty ball (before the first call) shows this instead of a number. */
  readonly placeholder?: string;
}

/** A glossy Tambola ball, coloured by its column like a real set. */
export function Ball({ n, size, placeholder }: BallProps) {
  const [light, deep] = n ? BALL_COLORS[columnOf(n)]! : ['#d8c8e6', '#7d6a92'];
  const r = size / 2;
  const disc = r * 0.62;
  const label = n ? String(n) : (placeholder ?? '');
  // The canvas overhangs the ball so its soft shadow never meets a hard edge.
  const pad = Math.ceil(size * 0.18);
  return (
    <View style={{ width: size, height: size }}>
      <Canvas
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          left: -pad,
          top: -pad,
          width: size + pad * 2,
          height: size + pad * 2,
        }}
      >
        <Group transform={[{ translateX: pad }, { translateY: pad }]}>
          <Circle cx={r + r * 0.04} cy={r + r * 0.1} r={r * 0.9} color="rgba(10, 0, 20, 0.4)">
            <BlurMask blur={r * 0.1} style="normal" />
          </Circle>
          <Circle cx={r} cy={r} r={r * 0.94}>
            <RadialGradient
              c={vec(r * 0.62, r * 0.55)}
              r={r * 1.5}
              colors={['#ffffff', light, deep, '#1d0a26']}
              positions={[0, 0.22, 0.78, 1]}
            />
          </Circle>
          <Circle cx={r} cy={r} r={disc} color="#fffaf0" />
          <Circle
            cx={r}
            cy={r}
            r={disc}
            color={deep}
            style="stroke"
            strokeWidth={Math.max(2, r * 0.04)}
          />
          <Oval
            x={r * 0.42}
            y={r * 0.16}
            width={r * 0.56}
            height={r * 0.26}
            color="rgba(255,255,255,0.55)"
          >
            <BlurMask blur={r * 0.05} style="normal" />
          </Oval>
        </Group>
      </Canvas>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          allowFontScaling={false}
          style={[
            styles.number,
            {
              fontSize: label.length > 1 ? disc * 0.95 : disc * 1.1,
              lineHeight: disc * 1.3,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

/**
 * The big reveal: each new number rolls in from the side, spinning, and
 * lands with a bounce. Under calmer motion it simply fades in.
 */
export function RollingBall({ n, size, placeholder, distance }: BallProps & { distance: number }) {
  const { calmMotion } = useSettings();
  const x = useSharedValue(0);
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const fade = useSharedValue(1);
  const shown = useRef(n);
  useEffect(() => {
    if (shown.current === n) return;
    shown.current = n;
    if (n === null) return;
    if (calmMotion) {
      fade.set(0);
      fade.set(withTiming(1, { duration: 260 }));
      return;
    }
    x.set(-distance);
    spin.set(-540);
    x.set(withSpring(0, { damping: 13, stiffness: 120, mass: 0.9 }));
    spin.set(withTiming(0, { duration: 760, easing: Easing.out(Easing.cubic) }));
    pop.set(
      withSequence(
        withTiming(1, { duration: 520 }),
        withSpring(1.12, { damping: 6, stiffness: 400 }),
        withSpring(1, { damping: 9, stiffness: 220 }),
      ),
    );
  }, [n, calmMotion, distance, x, spin, pop, fade]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateX: x.get() }, { rotate: `${spin.get()}deg` }, { scale: pop.get() }],
  }));
  return (
    <Animated.View style={style}>
      <Ball n={n} size={size} placeholder={placeholder} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  number: {
    fontFamily: FONTS.displayBold,
    color: '#2a1238',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
