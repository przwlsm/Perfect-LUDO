import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  createPicture,
  LinearGradient,
  Picture,
  RadialGradient,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { random, withAlpha } from 'app-kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const MOTES = 18;

/**
 * Behind the home screen: first light over a doorstep. A warm glow low on
 * the horizon, a faint grid of rice dots fading up into the sky, and a few
 * motes of flour dust turning slowly in the light. Still under calmer motion.
 */
export function Backdrop() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { calmMotion } = useSettings();
  const dawn = theme.scheme === 'dawn';
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    if (!calmMotion) clock.set(frame.timeSinceFirstFrame / 1000);
  });

  const dots = useMemo(
    () =>
      createPicture((canvas) => {
        const p = Skia.Paint();
        p.setAntiAlias(true);
        const step = 34;
        const cols = Math.ceil(width / step) + 1;
        const rows = Math.ceil((height * 0.5) / step);
        const ox = (width - (cols - 1) * step) / 2;
        for (let r = 0; r < rows; r++) {
          const a = (dawn ? 0.09 : 0.11) * (1 - r / rows);
          p.setColor(Skia.Color(withAlpha(dawn ? '#f7f0e3' : '#7b2d1a', a)));
          for (let c = 0; c < cols; c++) canvas.drawCircle(ox + c * step, 18 + r * step, 1.6, p);
        }
      }),
    [width, height, dawn],
  );

  const motes = useMemo(() => {
    const r = random(42);
    return Array.from({ length: MOTES }, () => [
      r() * width,
      height * (0.1 + r() * 0.8),
      0.8 + r() * 1.8,
      r() * 100,
      4 + r() * 8,
    ]).flat();
  }, [width, height]);
  const moteColour = dawn ? '#ffe7b8' : '#b8641e';
  const motePic = useDerivedValue(() => {
    const t = clock.get();
    return createPicture((canvas) => {
      const p = Skia.Paint();
      p.setAntiAlias(true);
      for (let i = 0; i < motes.length; i += 5) {
        const phase = motes[i + 3]!;
        const x = motes[i]! + Math.sin(t * 0.15 + phase) * 18;
        const y = motes[i + 1]! - ((t * motes[i + 4]! + phase * 7) % (height * 0.9)) * 0.25;
        const a = 0.12 + 0.12 * Math.sin(t * 0.7 + phase);
        p.setColor(Skia.Color(moteColour));
        p.setAlphaf(Math.max(0, a));
        canvas.drawCircle(x, y, motes[i + 2]!, p);
      }
    });
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[theme.sky[0], theme.sky[1], theme.sky[2]]}
          positions={[0, 0.35, 1]}
        />
      </Rect>
      <Rect x={0} y={0} width={width} height={height}>
        <RadialGradient
          c={vec(width * 0.5, -height * 0.05)}
          r={width * 0.95}
          colors={[
            dawn ? 'rgba(255, 170, 90, 0.22)' : 'rgba(255, 200, 120, 0.45)',
            'rgba(0,0,0,0)',
          ]}
        />
      </Rect>
      <Picture picture={dots} />
      <Picture picture={motePic} />
    </Canvas>
  );
}
