import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { random, withAlpha } from 'app-kit';
import type { Script } from '@/domain/entities/Script';
import { AppText } from '../components/Kit';
import { ScriptText } from '../components/Bits';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Three stars that pop in one after another. */
export function StarRow({ count, size = 34 }: { count: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[0, 1, 2].map((i) => (
        <PopStar key={i} index={i} on={i < count} size={size} />
      ))}
    </View>
  );
}

function PopStar({ index, on, size }: { index: number; on: boolean; size: number }) {
  const theme = useTheme();
  const { calmMotion } = useSettings();
  const s = useSharedValue(calmMotion || !on ? 1 : 0);
  useEffect(() => {
    if (calmMotion || !on) {
      s.set(1);
      return;
    }
    s.set(0);
    s.set(withDelay(140 + index * 170, withSpring(1, { damping: 9, stiffness: 240 })));
  }, [on, index, s, calmMotion]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.get() }, { rotate: `${(1 - s.get()) * -40}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Ionicons
        name={on ? 'star' : 'star-outline'}
        size={size}
        color={on ? theme.star : theme.starEmpty}
      />
    </Animated.View>
  );
}

const STAMP = 132;

/**
 * The three-star moment: a round ink stamp with "well done" in the
 * script's own words lands on the page, and a few sparks fly.
 */
export function Stamp({ script, onDone }: { script: Script; onDone?: () => void }) {
  const theme = useTheme();
  const { calmMotion } = useSettings();
  const land = useSharedValue(calmMotion ? 1 : 0);
  const burst = useSharedValue(0);
  useEffect(() => {
    if (calmMotion) {
      land.set(withTiming(1, { duration: 250 }));
    } else {
      land.set(
        withSequence(
          withTiming(0, { duration: 0 }),
          withSpring(1, { damping: 11, stiffness: 180 }),
        ),
      );
      burst.set(withDelay(120, withTiming(1, { duration: 1100 })));
    }
    const timer = setTimeout(() => onDone?.(), 2600);
    return () => clearTimeout(timer);
  }, [land, burst, calmMotion, onDone]);
  const stampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, land.get() * 2),
    transform: [{ scale: 1.7 - 0.7 * land.get() }, { rotate: '-9deg' }],
  }));
  const ink = theme.vermilion;
  return (
    <View style={styles.stampWrap} pointerEvents="none">
      {!calmMotion && <Sparks progress={burst} colour={theme.star} />}
      <Animated.View
        style={[
          styles.stamp,
          { borderColor: ink, backgroundColor: withAlpha(theme.surface, 0.82) },
          stampStyle,
        ]}
      >
        <View style={[styles.stampInner, { borderColor: ink }]}>
          <ScriptText script={script} size={script.rtl ? 30 : 28} color={ink} style={styles.praise}>
            {script.praise[0]}
          </ScriptText>
          <AppText variant="label" color={ink} style={styles.praiseRoman}>
            {script.praise[1]}
          </AppText>
        </View>
      </Animated.View>
    </View>
  );
}

const SPARKS = 16;

function Sparks({ progress, colour }: { progress: SharedValue<number>; colour: string }) {
  const size = STAMP * 2.4;
  const c = size / 2;
  const seeds = useMemo(() => {
    const r = random(7);
    return Array.from({ length: SPARKS }, (_, i) => ({
      angle: (i / SPARKS) * Math.PI * 2 + r() * 0.3,
      reach: 0.65 + r() * 0.4,
      size: 2.5 + r() * 3.5,
      star: i % 3 === 0,
    }));
  }, []);
  const star = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 === 0 ? 1 : 0.38;
      if (k === 0) b.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else b.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    b.close();
    return b.build();
  }, []);
  return (
    // Skia's web canvas takes one plain style object, not an array.
    <Canvas style={{ position: 'absolute', width: size, height: size }}>
      {seeds.map((s, i) => (
        <Spark key={i} seed={s} progress={progress} c={c} colour={colour} star={star} />
      ))}
    </Canvas>
  );
}

function Spark({
  seed,
  progress,
  c,
  colour,
  star,
}: {
  seed: { angle: number; reach: number; size: number; star: boolean };
  progress: SharedValue<number>;
  c: number;
  colour: string;
  star: ReturnType<typeof Skia.Path.Make>;
}) {
  const dist = useDerivedValue(() => {
    const p = progress.get();
    return STAMP * 0.45 + (1 - (1 - p) * (1 - p)) * STAMP * 0.6 * seed.reach;
  });
  const x = useDerivedValue(() => c + Math.cos(seed.angle) * dist.get());
  const y = useDerivedValue(() => c + Math.sin(seed.angle) * dist.get());
  const opacity = useDerivedValue(() => {
    const p = progress.get();
    return p <= 0 || p >= 1 ? 0 : Math.min(1, p * 6) * (1 - p);
  });
  const transform = useDerivedValue(() => [
    { translateX: x.get() },
    { translateY: y.get() },
    { scale: seed.size * 1.6 },
    { rotate: progress.get() * 2 },
  ]);
  if (seed.star) {
    return (
      <Group transform={transform} opacity={opacity}>
        <Path path={star} color={colour} />
      </Group>
    );
  }
  return <Circle cx={x} cy={y} r={seed.size * 0.6} color={colour} opacity={opacity} />;
}

const styles = StyleSheet.create({
  starRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stampWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    width: STAMP,
    height: STAMP,
    borderRadius: STAMP / 2,
    borderWidth: 4,
    padding: 5,
  },
  stampInner: {
    flex: 1,
    borderRadius: STAMP / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  praise: { textAlign: 'center', marginBottom: -6 },
  praiseRoman: { letterSpacing: 2 },
});
