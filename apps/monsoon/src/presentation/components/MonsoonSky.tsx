import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  BlurStyle,
  Canvas,
  createPicture,
  LinearGradient,
  PaintStyle,
  Picture,
  Rect,
  Skia,
  StrokeCap,
  vec,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { random } from 'app-kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The sky behind the home screen: storm clouds at dusk or bright clouds in
 * the morning, drifting, with rain slanting through. Everything holds still
 * under calmer motion.
 */
export function MonsoonSky({
  height: fixedHeight,
  clear = false,
}: {
  height?: number;
  /** After a win: the rain stops and the clouds thin out. */
  clear?: boolean;
}) {
  const theme = useTheme();
  const { width, height: screen } = useWindowDimensions();
  const height = fixedHeight ?? screen;
  const { calmMotion } = useSettings();
  const clock = useSharedValue(0);
  const clearing = useSharedValue(clear ? 1 : 0);
  useEffect(() => {
    clearing.set(withTiming(clear ? 1 : 0, { duration: calmMotion ? 300 : 1800 }));
  }, [clear, calmMotion, clearing]);
  useFrameCallback((frame) => {
    if (!calmMotion) clock.set(clock.get() + (frame.timeSincePreviousFrame ?? 16));
  });
  const { clouds, rain } = useMemo(() => {
    const r = random(31);
    return {
      // x, y, scale, speed, shade
      clouds: Array.from({ length: 6 }, (_, i) => [
        r() * width,
        height * (0.02 + i * 0.07 + r() * 0.04),
        0.7 + r() * 0.8,
        4 + r() * 8,
        r(),
      ]).flat(),
      rain: Array.from({ length: 70 * 3 }, () => r()),
    };
  }, [width, height]);
  const dusk = theme.scheme === 'dusk';
  const calm = calmMotion;
  const cloudColour = theme.cloudFill;
  const rainColour = theme.rain;

  const picture = useDerivedValue(() => {
    const t = clock.get() / 1000;
    const clearNow = clearing.get();
    return createPicture((canvas) => {
      const p = Skia.Paint();
      p.setAntiAlias(true);
      p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 10, true));
      for (let i = 0; i < clouds.length; i += 5) {
        const s = clouds[i + 2]!;
        const span = width + 260 * s;
        const x = ((clouds[i]! + t * clouds[i + 3]!) % span) - 130 * s;
        const y = clouds[i + 1]!;
        p.setColor(Skia.Color(cloudColour));
        p.setAlphaf(((dusk ? 0.55 : 0.75) - clouds[i + 4]! * 0.25) * (1 - 0.7 * clearNow));
        for (let k = 0; k < 5; k++) {
          canvas.drawCircle(
            x + (k - 2) * 34 * s,
            y + Math.sin(k * 1.9) * 9 * s,
            (28 + (k % 3) * 12) * s,
            p,
          );
        }
      }
      const rp = Skia.Paint();
      rp.setAntiAlias(true);
      rp.setStyle(PaintStyle.Stroke);
      rp.setStrokeCap(StrokeCap.Round);
      rp.setStrokeWidth(1.2);
      rp.setColor(Skia.Color(rainColour));
      // Calmer motion: no rain at all, not even still streaks.
      for (let k = 0; k < (calm ? 0 : rain.length); k += 3) {
        const speed = 0.35 + rain[k + 2]! * 0.3;
        const fall = (t * speed + rain[k + 1]!) % 1;
        const x = rain[k]! * (width + 80) - fall * 80;
        const y = -30 + fall * (height + 60);
        rp.setAlphaf((0.35 + 0.65 * rain[k + 2]!) * (1 - clearNow));
        canvas.drawLine(x, y, x - 4, y + 16 + rain[k + 2]! * 10, rp);
      }
    });
  });

  return (
    <Canvas
      style={StyleSheet.flatten([StyleSheet.absoluteFill, fixedHeight ? { height } : null])}
      pointerEvents="none"
    >
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width * 0.2, height)} colors={[...theme.sky]} />
      </Rect>
      <Picture picture={picture} />
    </Canvas>
  );
}
