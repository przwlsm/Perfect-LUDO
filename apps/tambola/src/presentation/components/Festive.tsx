import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { random } from '@/application/seed';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The party's backdrop: a night (or warm day) gradient, soft bokeh, and a
 * sagging string of fairy lights across the top whose bulbs twinkle. Under
 * calmer motion the bulbs hold still.
 */
export function FestiveBackdrop({ lights = true }: { lights?: boolean }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { calmMotion } = useSettings();
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    if (!calmMotion) clock.set(frame.timeSinceFirstFrame / 1000);
  });
  const night = theme.scheme === 'night';
  const bokeh = useMemo(() => {
    const r = random(7);
    return Array.from({ length: 14 }, (_, i) => ({
      x: r() * width,
      y: height * (0.15 + r() * 0.8),
      size: 20 + r() * 60,
      color: theme.bulbs[i % theme.bulbs.length]!,
    }));
  }, [width, height, theme.bulbs]);
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width * 0.35, height)}
            colors={[...theme.sky]}
          />
        </Rect>
        <Group opacity={night ? 0.16 : 0.1}>
          {bokeh.map((b, i) => (
            <Circle key={i} cx={b.x} cy={b.y} r={b.size} color={b.color}>
              <BlurMask blur={b.size * 0.6} style="normal" />
            </Circle>
          ))}
        </Group>
        {lights && <LightString width={width} y={18} sag={34} clock={clock} />}
      </Canvas>
    </View>
  );
}

interface LightStringProps {
  readonly width: number;
  readonly y: number;
  readonly sag: number;
  readonly clock: SharedValue<number>;
}

/** A wire hung from both edges with bulbs along it. */
export function LightString({ width, y, sag, clock }: LightStringProps) {
  const theme = useTheme();
  const count = Math.max(7, Math.round(width / 46));
  const { wire, bulbs } = useMemo(() => {
    const at = (t: number) => {
      const x = -10 + t * (width + 20);
      // A quadratic sag, lowest in the middle.
      return { x, y: y + 4 * sag * t * (1 - t) };
    };
    const b = Skia.PathBuilder.Make();
    b.moveTo(at(0).x, at(0).y);
    for (let i = 1; i <= 40; i++) {
      const p = at(i / 40);
      b.lineTo(p.x, p.y);
    }
    const r = random(11);
    const list = Array.from({ length: count }, (_, i) => {
      const p = at((i + 0.5) / count);
      return {
        ...p,
        color: theme.bulbs[i % theme.bulbs.length]!,
        phase: r() * Math.PI * 2,
        speed: 0.8 + r() * 1.6,
      };
    });
    return { wire: b.build(), bulbs: list };
  }, [width, y, sag, count, theme.bulbs]);
  return (
    <Group>
      <Path path={wire} color={theme.wire} style="stroke" strokeWidth={1.5} />
      {bulbs.map((b, i) => (
        <Bulb key={i} {...b} clock={clock} night={theme.scheme === 'night'} />
      ))}
    </Group>
  );
}

interface BulbProps {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly phase: number;
  readonly speed: number;
  readonly night: boolean;
  readonly clock: SharedValue<number>;
}

function Bulb({ x, y, color, phase, speed, night, clock }: BulbProps) {
  const glow = useDerivedValue(
    () => (night ? 0.35 : 0.2) + 0.45 * (0.5 + 0.5 * Math.sin(clock.get() * speed + phase)),
  );
  return (
    <Group>
      <Circle cx={x} cy={y + 9} r={11} color={color} opacity={glow}>
        <BlurMask blur={8} style="normal" />
      </Circle>
      <Rect x={x - 2.5} y={y} width={5} height={4} color={night ? '#6b5a3a' : '#8a6a4a'} />
      <Circle cx={x} cy={y + 9} r={5.5} color={color} />
      <Circle cx={x - 1.6} cy={y + 7.2} r={1.6} color="#ffffff" opacity={0.7} />
    </Group>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
});
