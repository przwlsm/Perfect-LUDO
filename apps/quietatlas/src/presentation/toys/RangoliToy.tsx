import { useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  BlurStyle,
  Canvas,
  Circle,
  createPicture,
  Fill,
  FractalNoise,
  Group,
  Image,
  PaintStyle,
  Picture,
  RadialGradient,
  Skia,
  StrokeCap,
  StrokeJoin,
  useCanvasRef,
  vec,
  type SkCanvas,
  type SkPath,
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  FOLD_CHOICES,
  midpointCurve,
  slices,
  type Folds,
  type SliceTransform,
} from '@/application/symmetry/symmetry';
import { toyById } from '@/domain/entities/Toy';
import { AppText, IconButton, Pressy } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { ColorBar, LookBar, useLook } from './Looks';
import { rasterize } from './raster';
import { useChrome } from './ToyChrome';
import { ToyShell } from './ToyShell';
import { useSharePicture } from './useSharePicture';
import { useToyGesture } from './useToyGesture';

const TOY = toyById('rangoli')!;
const WIDTHS: readonly number[] = [5, 10, 17];
const WIDTH_NAMES = ['rangoli.thin', 'rangoli.medium', 'rangoli.thick'] as const;
/** Finger travel (dp) between grains of haptic and sound. */
const GRAIN_STEP = 26;

interface Stroke {
  readonly kind: 'line' | 'petals';
  readonly path: SkPath;
  readonly color: string;
  readonly width: number;
}

/**
 * Rangoli: coloured powder drawn around a centre. A stroke is stored once
 * and drawn in every slice of the pattern (rotated, and mirrored in
 * between), so even a scribble becomes a symmetrical design. Finished
 * strokes are baked into one image; only the stroke in progress is redrawn
 * per frame.
 */
export function RangoliToy() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { haptics, sounds, calmMotion } = useSettings();
  const { look, choose } = useLook('rangoli');
  const chrome = useChrome();
  const canvas = useCanvasRef();
  const share = useSharePicture(canvas, 'rangoli');

  const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
  const [live, setLive] = useState<Stroke | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [folds, setFolds] = useState<Folds>(8);
  const [mirror, setMirror] = useState(true);
  const [widthIndex, setWidthIndex] = useState(1);
  const points = useRef<number[]>([]);
  const liveRef = useRef<Stroke | null>(null);
  const travelled = useRef(0);
  const color = look.colors[colorIndex % look.colors.length]!;
  const cx = width / 2;
  const cy = height / 2;
  const transforms = useMemo(() => slices(folds, mirror), [folds, mirror]);

  const layer = useMemo(
    () =>
      strokes.length === 0
        ? null
        : rasterize(width, height, (c) => {
            for (const s of strokes) drawPowder(c, s, transforms, cx, cy);
          }),
    [strokes, transforms, width, height, cx, cy],
  );
  const livePicture = useMemo(
    () =>
      live
        ? createPicture((c) => drawPowder(c, live, transforms, cx, cy), { width, height })
        : null,
    [live, transforms, width, height, cx, cy],
  );

  // Clearing blows the powder away: it swells, turns and fades.
  const sweep = useSharedValue(0);
  const sweepTransform = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { scale: 1 + sweep.get() * 0.25 },
    { rotate: sweep.get() * 0.35 },
    { translateX: -cx },
    { translateY: -cy },
  ]);
  const sweepOpacity = useDerivedValue(() => 1 - sweep.get());

  const setLiveStroke = (stroke: Stroke | null) => {
    liveRef.current = stroke;
    setLive(stroke);
  };
  const begin = (x: number, y: number) => {
    chrome.touching(true);
    points.current = [x, y];
    travelled.current = 0;
    setLiveStroke({
      kind: 'line',
      path: curveFrom(points.current),
      color,
      width: WIDTHS[widthIndex] ?? 10,
    });
  };
  const move = (x: number, y: number) => {
    const p = points.current;
    const step = Math.hypot(x - p[p.length - 2]!, y - p[p.length - 1]!);
    if (step < 2) return;
    p.push(x, y);
    travelled.current += step;
    if (travelled.current > GRAIN_STEP) {
      travelled.current = 0;
      haptics.tick();
      sounds.play('sprinkle');
    }
    setLiveStroke({ kind: 'line', path: curveFrom(p), color, width: WIDTHS[widthIndex] ?? 10 });
  };
  const end = () => {
    chrome.touching(false);
    const finished = liveRef.current;
    if (finished && points.current.length >= 4) setStrokes((s) => [...s, finished]);
    setLiveStroke(null);
  };
  const tap = (x: number, y: number) => {
    haptics.tap();
    sounds.play('sprinkle');
    const stroke: Stroke = {
      kind: 'petals',
      path: petals(x, y, 6 + widthIndex * 4),
      color,
      width: 0,
    };
    setStrokes((s) => [...s, stroke]);
  };

  const gesture = useToyGesture({
    minDistance: 3,
    onBegin: (p) => begin(p.x, p.y),
    onMove: (p) => move(p.x, p.y),
    onEnd: end,
    onTap: (p) => tap(p.x, p.y),
  });

  const clear = () => {
    if (strokes.length === 0) return;
    haptics.thump();
    sounds.play('swish');
    if (calmMotion) {
      setStrokes([]);
      return;
    }
    sweep.set(withSequence(withTiming(1, { duration: 650 }), withTiming(0, { duration: 0 })));
    setTimeout(() => setStrokes([]), 640);
  };

  const guideRadius = Math.min(width, height) * 0.42;
  const reach = Math.max(width, height) * 0.75;

  return (
    <ToyShell
      toy={TOY}
      background={look.backgroundEdge}
      actions={
        <IconButton
          icon="share-outline"
          label={t('toy.share')}
          onPress={() => void share().catch(() => undefined)}
          disabled={strokes.length === 0}
        />
      }
      tools={
        <>
          <View style={styles.toolRow}>
            <IconButton
              icon="arrow-undo"
              label={t('toy.undo')}
              onPress={() => setStrokes((s) => s.slice(0, -1))}
              disabled={strokes.length === 0}
            />
            <ColorBar colors={look.colors} index={colorIndex} onPick={setColorIndex} />
            <IconButton
              icon="trash-outline"
              label={t('toy.clear')}
              onPress={clear}
              disabled={strokes.length === 0}
            />
          </View>
          <View style={styles.toolRow}>
            <Pressy
              onPress={() =>
                setFolds(FOLD_CHOICES[(FOLD_CHOICES.indexOf(folds) + 1) % FOLD_CHOICES.length]!)
              }
              accessibilityLabel={t('rangoli.folds', { count: folds })}
              style={[
                styles.pill,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <AppText variant="heading">✳ {t('rangoli.folds', { count: folds })}</AppText>
            </Pressy>
            <Pressy
              onPress={() => setMirror((m) => !m)}
              accessibilityLabel={t('rangoli.mirror')}
              accessibilityState={{ selected: mirror }}
              style={[
                styles.pill,
                {
                  backgroundColor: mirror ? theme.accent : theme.glass,
                  borderColor: theme.glassBorder,
                },
              ]}
            >
              <AppText variant="heading" color={mirror ? theme.onAccent : theme.text}>
                ⇋ {t('rangoli.mirror')}
              </AppText>
            </Pressy>
            <Pressy
              onPress={() => setWidthIndex((w) => (w + 1) % WIDTHS.length)}
              accessibilityLabel={`${t('rangoli.brush')}: ${t(WIDTH_NAMES[widthIndex]!)}`}
              style={[
                styles.pill,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <View
                style={{
                  width: 8 + widthIndex * 6,
                  height: 8 + widthIndex * 6,
                  borderRadius: 12,
                  backgroundColor: color,
                }}
              />
            </Pressy>
          </View>
          <LookBar toy="rangoli" current={look} onChoose={choose} />
        </>
      }
    >
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Canvas ref={canvas} style={StyleSheet.absoluteFill}>
            {/* The courtyard floor: warm, slightly grainy earth. */}
            <Fill color={look.backgroundEdge} />
            <Circle cx={cx} cy={cy} r={reach}>
              <RadialGradient
                c={vec(cx, cy)}
                r={reach}
                colors={[look.background, look.backgroundEdge]}
              />
            </Circle>
            <Fill opacity={0.07}>
              <FractalNoise freqX={0.9} freqY={0.9} octaves={3} />
            </Fill>
            {/* Kolam dots: a faint ring of rice-flour points to draw around. */}
            <Group opacity={0.2}>
              {Array.from({ length: folds * 2 }, (_, k) => {
                const a = (k / (folds * 2)) * Math.PI * 2;
                return (
                  <Circle
                    key={k}
                    cx={cx + Math.cos(a) * guideRadius}
                    cy={cy + Math.sin(a) * guideRadius}
                    r={2}
                    color="#fff6e0"
                  />
                );
              })}
              <Circle cx={cx} cy={cy} r={3} color="#fff6e0" />
            </Group>
            <Group transform={sweepTransform} opacity={sweepOpacity}>
              {layer && <Image image={layer} x={0} y={0} width={width} height={height} />}
              {livePicture && <Picture picture={livePicture} />}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </ToyShell>
  );
}

function curveFrom(pts: readonly number[]): SkPath {
  const curve = midpointCurve(pts);
  const b = Skia.PathBuilder.Make();
  if (!curve) return b.build();
  b.moveTo(curve.start[0], curve.start[1]);
  for (const [qx, qy, ex, ey] of curve.quads) b.quadTo(qx, qy, ex, ey);
  return b.build();
}

/** A little six-petal flower of powder, the kind scattered between lines. */
function petals(x: number, y: number, size: number): SkPath {
  const b = Skia.PathBuilder.Make();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * size;
    const py = y + Math.sin(a) * size;
    b.addOval(Skia.XYWHRect(px - size * 0.55, py - size * 0.55, size * 1.1, size * 1.1));
  }
  b.addCircle(x, y, size * 0.45);
  return b.build();
}

/**
 * Coloured powder: a soft-edged, slightly rough line with lighter grains
 * along it, drawn once per slice of the pattern.
 */
function drawPowder(
  canvas: SkCanvas,
  stroke: Stroke,
  transforms: readonly SliceTransform[],
  cx: number,
  cy: number,
): void {
  const body = Skia.Paint();
  body.setAntiAlias(true);
  body.setColor(Skia.Color(stroke.color));
  body.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 1.1, true));
  let grain: ReturnType<typeof Skia.Paint> | null = null;
  if (stroke.kind === 'line') {
    body.setStyle(PaintStyle.Stroke);
    body.setStrokeWidth(stroke.width);
    body.setStrokeCap(StrokeCap.Round);
    body.setStrokeJoin(StrokeJoin.Round);
    body.setPathEffect(Skia.PathEffect.MakeDiscrete(4, stroke.width * 0.16, 7));
    grain = Skia.Paint();
    grain.setAntiAlias(true);
    grain.setColor(Skia.Color('rgba(255,255,255,0.45)'));
    grain.setStyle(PaintStyle.Stroke);
    grain.setStrokeWidth(Math.max(1, stroke.width * 0.22));
    grain.setStrokeCap(StrokeCap.Round);
    grain.setPathEffect(Skia.PathEffect.MakeDash([0.5, stroke.width * 0.9]));
  } else {
    body.setPathEffect(Skia.PathEffect.MakeDiscrete(3, 1.2, 3));
  }
  for (const s of transforms) {
    canvas.save();
    canvas.translate(cx, cy);
    canvas.rotate((s.rotate * 180) / Math.PI, 0, 0);
    if (s.mirror) canvas.scale(-1, 1);
    canvas.translate(-cx, -cy);
    canvas.drawPath(stroke.path, body);
    if (grain) canvas.drawPath(stroke.path, grain);
    canvas.restore();
  }
}

const styles = StyleSheet.create({
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pill: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
