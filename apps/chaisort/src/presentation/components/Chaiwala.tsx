import { useMemo } from 'react';
import {
  Canvas,
  createPicture,
  PaintStyle,
  Picture,
  Skia,
  StrokeCap,
  TileMode,
} from '@shopify/react-native-skia';

export type Mood = 'waiting' | 'happy' | 'cheer';

/**
 * The chaiwala who placed the order: a round, cheerful face with a big
 * moustache, a cream cap and a checked towel over his shoulder. He waits,
 * smiles as cups come ready, and beams when the order is served.
 */
export function Chaiwala({ size, mood }: { size: number; mood: Mood }) {
  const picture = useMemo(
    () =>
      createPicture((c) => {
        const s = size;
        const paint = (colour: string) => {
          const p = Skia.Paint();
          p.setAntiAlias(true);
          p.setColor(Skia.Color(colour));
          return p;
        };
        const line = (colour: string, w: number) => {
          const p = paint(colour);
          p.setStyle(PaintStyle.Stroke);
          p.setStrokeWidth(w);
          p.setStrokeCap(StrokeCap.Round);
          return p;
        };
        const cx = s / 2;
        // A warm disc behind him.
        const halo = Skia.Paint();
        halo.setAntiAlias(true);
        halo.setShader(
          Skia.Shader.MakeRadialGradient(
            { x: cx, y: s * 0.45 },
            s * 0.5,
            [Skia.Color('#ffd79a'), Skia.Color('#f2a541')],
            null,
            TileMode.Clamp,
          ),
        );
        c.drawCircle(cx, s / 2, s / 2, halo);
        c.save();
        c.clipRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, s, s), s / 2, s / 2), 1, true);
        // Kurta and towel.
        c.drawOval(Skia.XYWHRect(cx - s * 0.42, s * 0.78, s * 0.84, s * 0.6), paint('#e0782f'));
        const towel = Skia.PathBuilder.Make()
          .moveTo(cx - s * 0.36, s * 0.84)
          .lineTo(cx - s * 0.12, s * 0.8)
          .lineTo(cx - s * 0.02, s * 1.05)
          .lineTo(cx - s * 0.3, s * 1.05)
          .close()
          .build();
        c.drawPath(towel, paint('#fdf3e3'));
        for (let i = 0; i < 3; i++) {
          c.drawLine(
            cx - s * (0.32 - i * 0.08),
            s * 0.84,
            cx - s * (0.25 - i * 0.08),
            s * 1.04,
            line('#c4362c', s * 0.025),
          );
        }
        // Neck and face.
        c.drawRect(Skia.XYWHRect(cx - s * 0.08, s * 0.66, s * 0.16, s * 0.14), paint('#b8784c'));
        c.drawOval(Skia.XYWHRect(cx - s * 0.25, s * 0.26, s * 0.5, s * 0.5), paint('#c98b5e'));
        // Ears.
        c.drawCircle(cx - s * 0.25, s * 0.52, s * 0.05, paint('#b8784c'));
        c.drawCircle(cx + s * 0.25, s * 0.52, s * 0.05, paint('#b8784c'));
        // Cap.
        const cap = Skia.PathBuilder.Make()
          .moveTo(cx - s * 0.25, s * 0.37)
          .cubicTo(cx - s * 0.22, s * 0.16, cx + s * 0.22, s * 0.16, cx + s * 0.25, s * 0.37)
          .close()
          .build();
        c.drawPath(cap, paint('#f4ead8'));
        c.drawLine(cx - s * 0.25, s * 0.37, cx + s * 0.25, s * 0.37, line('#d8c7a8', s * 0.025));
        // Eyes.
        const eye = line('#2b1a12', s * 0.03);
        if (mood === 'waiting') {
          c.drawCircle(cx - s * 0.09, s * 0.48, s * 0.028, paint('#2b1a12'));
          c.drawCircle(cx + s * 0.09, s * 0.48, s * 0.028, paint('#2b1a12'));
        } else {
          for (const d of [-1, 1]) {
            c.drawPath(
              Skia.PathBuilder.Make()
                .moveTo(cx + d * s * 0.09 - s * 0.04, s * 0.49)
                .quadTo(cx + d * s * 0.09, s * 0.44, cx + d * s * 0.09 + s * 0.04, s * 0.49)
                .build(),
              eye,
            );
          }
        }
        // Brows.
        c.drawLine(cx - s * 0.13, s * 0.42, cx - s * 0.05, s * 0.41, line('#2b1a12', s * 0.025));
        c.drawLine(cx + s * 0.05, s * 0.41, cx + s * 0.13, s * 0.42, line('#2b1a12', s * 0.025));
        // Rosy cheeks.
        const blush = paint('#e5776a');
        blush.setAlphaf(mood === 'waiting' ? 0.3 : 0.55);
        c.drawCircle(cx - s * 0.16, s * 0.57, s * 0.04, blush);
        c.drawCircle(cx + s * 0.16, s * 0.57, s * 0.04, blush);
        // Mouth.
        if (mood === 'cheer') {
          c.drawPath(
            Skia.PathBuilder.Make()
              .moveTo(cx - s * 0.08, s * 0.63)
              .quadTo(cx, s * 0.74, cx + s * 0.08, s * 0.63)
              .close()
              .build(),
            paint('#7a2a1c'),
          );
        } else {
          c.drawPath(
            Skia.PathBuilder.Make()
              .moveTo(cx - s * 0.07, s * 0.635)
              .quadTo(cx, mood === 'happy' ? s * 0.69 : s * 0.665, cx + s * 0.07, s * 0.635)
              .build(),
            line('#7a2a1c', s * 0.025),
          );
        }
        // The moustache, curled up at the ends.
        const tache = Skia.PathBuilder.Make()
          .moveTo(cx, s * 0.585)
          .cubicTo(cx - s * 0.06, s * 0.555, cx - s * 0.15, s * 0.58, cx - s * 0.19, s * 0.55)
          .cubicTo(cx - s * 0.2, s * 0.6, cx - s * 0.1, s * 0.63, cx, s * 0.61)
          .cubicTo(cx + s * 0.1, s * 0.63, cx + s * 0.2, s * 0.6, cx + s * 0.19, s * 0.55)
          .cubicTo(cx + s * 0.15, s * 0.58, cx + s * 0.06, s * 0.555, cx, s * 0.585)
          .close()
          .build();
        c.drawPath(tache, paint('#2b1a12'));
        c.restore();
      }),
    [size, mood],
  );
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  );
}
