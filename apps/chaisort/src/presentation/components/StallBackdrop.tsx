import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  BlurStyle,
  Canvas,
  createPicture,
  PaintStyle,
  Picture,
  Skia,
  TileMode,
} from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const BULBS = ['#ffcf6b', '#ff8f6b', '#ffe9a8', '#7fe0c4', '#ffb35c'];

/**
 * The stall behind every screen. Evening: string lights sagging across a
 * dark sky, gently twinkling. Morning: warm sun through an open front,
 * with soft shafts of light. Decoration only: calmer motion keeps it still.
 */
export function StallBackdrop({ lights = true }: { lights?: boolean }) {
  const theme = useTheme();
  const { calmMotion } = useSettings();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const evening = theme.scheme === 'evening';
  const clock = useSharedValue(0);
  useFrameCallback(
    (f) => {
      clock.set(f.timeSinceFirstFrame / 1000);
    },
    evening && lights && !calmMotion,
  );

  const strands = useMemo(() => {
    const list: { x: number; y: number; c: string }[][] = [];
    // Strung across the very top, above the screen's own controls.
    const top = insets.top * 0.6;
    const rows = [{ y0: top + 1, sag: 16, n: 13 }];
    rows.forEach((r, k) => {
      const pts: { x: number; y: number; c: string }[] = [];
      for (let i = 0; i <= r.n; i++) {
        const t = i / r.n;
        const x = -10 + t * (width + 20);
        const y = r.y0 + Math.sin(Math.PI * t) * r.sag + (k ? 3 : 0);
        pts.push({ x, y, c: BULBS[(i + k * 2) % BULBS.length]! });
      }
      list.push(pts);
    });
    return list;
  }, [width, insets.top]);

  const scene = useMemo(
    () =>
      createPicture((canvas) => {
        const p = Skia.Paint();
        p.setAntiAlias(true);
        p.setShader(
          Skia.Shader.MakeLinearGradient(
            { x: 0, y: 0 },
            { x: 0, y: height },
            theme.sky.map((c) => Skia.Color(c)),
            [0, 0.55, 1],
            TileMode.Clamp,
          ),
        );
        canvas.drawRect(Skia.XYWHRect(0, 0, width, height), p);
        p.setShader(null);
        if (evening) {
          // A warm glow low down, from the stove.
          p.setShader(
            Skia.Shader.MakeRadialGradient(
              { x: width * 0.5, y: height * 1.02 },
              height * 0.6,
              [Skia.Color('rgba(255, 140, 60, 0.22)'), Skia.Color('rgba(255, 140, 60, 0)')],
              null,
              TileMode.Clamp,
            ),
          );
          canvas.drawRect(Skia.XYWHRect(0, 0, width, height), p);
          if (lights) {
            const wire = Skia.Paint();
            wire.setAntiAlias(true);
            wire.setStyle(PaintStyle.Stroke);
            wire.setStrokeWidth(1.2);
            wire.setColor(Skia.Color('rgba(20, 10, 6, 0.9)'));
            for (const pts of strands) {
              const b = Skia.PathBuilder.Make().moveTo(pts[0]!.x, pts[0]!.y);
              for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1]!;
                const c = pts[i]!;
                b.quadTo((a.x + c.x) / 2, Math.max(a.y, c.y) + 6, c.x, c.y);
              }
              canvas.drawPath(b.build(), wire);
            }
          }
        } else {
          // Morning sun from the top right, and shafts of light.
          p.setShader(
            Skia.Shader.MakeRadialGradient(
              { x: width * 0.92, y: -height * 0.02 },
              Math.max(width, height) * 0.7,
              [Skia.Color('rgba(255, 246, 214, 0.95)'), Skia.Color('rgba(255, 220, 160, 0)')],
              null,
              TileMode.Clamp,
            ),
          );
          canvas.drawRect(Skia.XYWHRect(0, 0, width, height), p);
          p.setShader(null);
          p.setColor(Skia.Color('rgba(255, 255, 240, 0.22)'));
          p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 18, true));
          for (const [x, w] of [
            [0.35, 0.12],
            [0.58, 0.07],
            [0.78, 0.1],
          ] as const) {
            const b = Skia.PathBuilder.Make()
              .moveTo(width * (x + 0.25), -20)
              .lineTo(width * (x + 0.25 + w), -20)
              .lineTo(width * (x - 0.25 + w), height * 0.75)
              .lineTo(width * (x - 0.25), height * 0.75)
              .close()
              .build();
            canvas.drawPath(b, p);
          }
          p.setMaskFilter(null);
        }
      }),
    [width, height, theme, evening, lights, strands],
  );

  const bulbs = useDerivedValue(() => {
    const t = clock.get();
    return createPicture((canvas) => {
      if (!evening || !lights) return;
      const p = Skia.Paint();
      p.setAntiAlias(true);
      strands.forEach((pts, k) =>
        pts.forEach((b, i) => {
          if (i === 0 || i === pts.length - 1) return;
          const tw = calmMotion ? 0.85 : 0.72 + 0.28 * Math.sin(t * 1.3 + i * 1.7 + k * 2.1);
          p.setColor(Skia.Color(b.c));
          p.setAlphaf(0.33 * tw);
          p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 9, true));
          canvas.drawCircle(b.x, b.y + 7, 13, p);
          p.setMaskFilter(null);
          p.setAlphaf(0.75 + 0.25 * tw);
          canvas.drawOval(Skia.XYWHRect(b.x - 3.6, b.y + 2, 7.2, 10), p);
          p.setColor(Skia.Color('#2a1a10'));
          p.setAlphaf(1);
          canvas.drawRect(Skia.XYWHRect(b.x - 2.2, b.y - 1, 4.4, 3.5), p);
        }),
      );
    });
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Picture picture={scene} />
      <Picture picture={bulbs} />
    </Canvas>
  );
}
