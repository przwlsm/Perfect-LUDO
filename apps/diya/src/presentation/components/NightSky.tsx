import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { random } from 'app-kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const STARS = 56;
const MOTES = 14;

/**
 * The sky behind the home screen: a festival night (or a warm dusk) with
 * twinkling stars and a few lamp-motes drifting up like sky lanterns.
 * Everything holds still under calmer motion.
 */
export function NightSky() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { calmMotion } = useSettings();
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    if (!calmMotion) clock.set(frame.timeSinceFirstFrame / 1000);
  });
  const { stars, motes } = useMemo(() => {
    const r = random(7);
    return {
      stars: Array.from({ length: STARS }, () => ({
        x: r() * width,
        y: r() * height * 0.75,
        size: 0.5 + r() * 1.5,
        phase: r() * Math.PI * 2,
        speed: 0.4 + r() * 1.3,
      })),
      motes: Array.from({ length: MOTES }, () => ({
        x: r() * width,
        y: height * (0.35 + r() * 0.65),
        size: 2 + r() * 3.5,
        phase: r() * 100,
        speed: 8 + r() * 14,
      })),
    };
  }, [width, height]);
  const night = theme.scheme === 'night';
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width * 0.25, height)} colors={[...theme.sky]} />
      </Rect>
      <Circle cx={width * 0.5} cy={height * 1.05} r={height * 0.6} opacity={night ? 0.35 : 0.5}>
        <RadialGradient
          c={vec(width * 0.5, height * 1.05)}
          r={height * 0.6}
          colors={[night ? 'rgba(255,150,60,0.55)' : 'rgba(255,190,120,0.7)', 'rgba(255,150,60,0)']}
        />
      </Circle>
      <Group opacity={night ? 1 : 0.6}>
        {stars.map((s, i) => (
          <Star key={i} {...s} clock={clock} color={theme.star} />
        ))}
      </Group>
      {motes.map((m, i) => (
        <Mote key={i} {...m} clock={clock} height={height} night={night} />
      ))}
    </Canvas>
  );
}

interface StarProps {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly phase: number;
  readonly speed: number;
  readonly color: string;
  readonly clock: SharedValue<number>;
}

function Star({ x, y, size, phase, speed, color, clock }: StarProps) {
  const opacity = useDerivedValue(
    () => 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(clock.get() * speed + phase)),
  );
  return <Circle cx={x} cy={y} r={size} color={color} opacity={opacity} />;
}

function Mote({
  x,
  y,
  size,
  phase,
  speed,
  clock,
  height,
  night,
}: {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  clock: SharedValue<number>;
  height: number;
  night: boolean;
}) {
  const cy = useDerivedValue(() => {
    const travel = (clock.get() + phase) * speed;
    return y - (travel % (height * 0.9));
  });
  const cx = useDerivedValue(() => x + Math.sin((clock.get() + phase) * 0.6) * 10);
  const opacity = useDerivedValue(() => {
    const k = (y - cy.get()) / (height * 0.9);
    return (night ? 0.75 : 0.55) * Math.sin(Math.PI * Math.min(1, Math.max(0, k)));
  });
  return (
    <Circle cx={cx} cy={cy} r={size} color="#ffd27a" opacity={opacity}>
      <BlurMask blur={size * 1.3} style="solid" />
    </Circle>
  );
}
