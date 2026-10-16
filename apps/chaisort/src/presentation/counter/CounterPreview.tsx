import { useMemo } from 'react';
import { View } from 'react-native';
import { Canvas, createPicture, Picture, Skia, TileMode } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { isServed } from '@/application/engine/state';
import type { Palette } from '../theme/palette';
import { INKS } from './inks';
import { layoutCounter } from './layout';
import type { CupLook } from './looks';
import { cupGeo, drawCupBack, drawCupFront, drawLid, drawLiquid, drawSteam } from './paint';

export interface PreviewCup {
  readonly layers: readonly number[];
  readonly cap?: number;
  readonly lid?: number;
}

/**
 * A small still counter (home hero, cup themes, how to play). Finished cups
 * steam; everything else holds still.
 */
export function CounterPreview({
  cups,
  width,
  height,
  look,
  palette,
  symbols,
  calm,
  slab = true,
}: {
  cups: readonly PreviewCup[];
  width: number;
  height: number;
  look: CupLook;
  palette: Palette;
  symbols: boolean;
  calm: boolean;
  slab?: boolean;
}) {
  const evening = palette.scheme === 'evening';
  const layout = useMemo(
    () =>
      layoutCounter(
        cups.map((c) => c.cap ?? 4),
        width,
        height,
      ),
    [cups, width, height],
  );
  const geos = useMemo(
    () => layout.slots.map((s) => cupGeo(look, s.x, s.base, layout.w, layout.lh, s.cap)),
    [layout, look],
  );
  const still = useMemo(
    () =>
      createPicture((canvas) => {
        const lh = layout.lh;
        if (slab)
          for (const s of layout.shelves) {
            const p = Skia.Paint();
            p.setAntiAlias(true);
            p.setShader(
              Skia.Shader.MakeLinearGradient(
                { x: 0, y: s.y - lh * 0.1 },
                { x: 0, y: s.y + lh * 0.6 },
                palette.counter.map((c) => Skia.Color(c)),
                [0, 0.25, 1],
                TileMode.Clamp,
              ),
            );
            canvas.drawRRect(
              Skia.RRectXY(
                Skia.XYWHRect(s.x0, s.y - lh * 0.1, s.x1 - s.x0, lh * 0.6),
                lh * 0.18,
                lh * 0.18,
              ),
              p,
            );
          }
        geos.forEach((g, i) => {
          const cup = cups[i]!;
          drawCupBack(canvas, g, look, evening);
          drawLiquid(canvas, g, cup.layers, INKS, symbols);
          drawCupFront(canvas, g, look, i, evening);
          if ((cup.lid ?? 0) > 0) drawLid(canvas, g);
        });
      }),
    [geos, cups, look, evening, symbols, layout, palette, slab],
  );
  const served = useMemo(() => cups.map((c) => isServed(c.layers)), [cups]);
  const clock = useSharedValue(0);
  const anyServed = served.some(Boolean);
  useFrameCallback((f) => {
    clock.set(f.timeSinceFirstFrame / 1000);
  }, anyServed && !calm);
  const steam = useDerivedValue(() => {
    const t = clock.get();
    return createPicture((canvas) => {
      geos.forEach((g, i) => {
        if (served[i]) drawSteam(canvas, g, t, palette.steam, calm);
      });
    });
  });
  return (
    <View style={{ width, height }} pointerEvents="none">
      <Canvas style={{ width, height }}>
        <Picture picture={still} />
        <Picture picture={steam} />
      </Canvas>
    </View>
  );
}
