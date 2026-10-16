import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { random } from '@/application/random';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const STARS = 60;

/**
 * The home screen's sky: a dusk (or dawn) gradient with softly twinkling
 * stars. Stars hold still under calmer motion.
 */
export function Sky() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { calmMotion } = useSettings();
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    if (!calmMotion) clock.set(frame.timeSinceFirstFrame / 1000);
  });
  const stars = useMemo(() => {
    const r = random(42);
    return Array.from({ length: STARS }, () => ({
      x: r() * width,
      y: r() * height * 0.7,
      size: 0.6 + r() * 1.6,
      phase: r() * Math.PI * 2,
      speed: 0.4 + r() * 1.2,
    }));
  }, [width, height]);
  const dusk = theme.scheme === 'dusk';
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width * 0.3, height)} colors={[...theme.sky]} />
      </Rect>
      <Group opacity={dusk ? 1 : 0.55}>
        {stars.map((s, i) => (
          <Star key={i} {...s} clock={clock} color={theme.star} />
        ))}
      </Group>
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
    () => 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock.get() * speed + phase)),
  );
  return <Circle cx={x} cy={y} r={size} color={color} opacity={opacity} />;
}
