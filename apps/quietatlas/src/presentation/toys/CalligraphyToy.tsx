import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Fill,
  FractalNoise,
  Group,
  Line,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_BRUSH,
  DRY_MS,
  outline,
  wetness,
  type BrushSample,
} from '@/application/brush/brush';
import { toyById } from '@/domain/entities/Toy';
import { AppText, IconButton, Pressy } from '../components/Kit';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { LookBar, useLook } from './Looks';
import { useChrome } from './ToyChrome';
import { ToyShell } from './ToyShell';
import { useToyGesture } from './useToyGesture';

const TOY = toyById('calligraphy')!;

/** Characters to trace, with the meaning shown beside them. */
const GUIDES = [
  { char: '永', key: 'yong' },
  { char: '静', key: 'jing' },
  { char: '和', key: 'he' },
  { char: '心', key: 'xin' },
] as const;

interface WetStroke {
  readonly id: number;
  readonly path: SkPath;
  readonly painted: number;
}

/**
 * Water on stone. Each stroke is a brush outline whose width follows the
 * hand's speed; it stays dark for a few seconds, then dries from the edges
 * and is gone. There is deliberately no undo, no save and no share: this toy
 * is about letting go.
 */
export function CalligraphyToy() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const { haptics, sounds } = useSettings();
  const { look, choose } = useLook('calligraphy');
  const chrome = useChrome();
  const brush = useMemo(() => {
    const scale = Math.min(width, height) / 380;
    return {
      ...DEFAULT_BRUSH,
      minWidth: DEFAULT_BRUSH.minWidth * scale,
      maxWidth: DEFAULT_BRUSH.maxWidth * scale,
    };
  }, [width, height]);

  const [strokes, setStrokes] = useState<readonly WetStroke[]>([]);
  const [live, setLive] = useState<SkPath | null>(null);
  const [guide, setGuide] = useState(-1);
  const samples = useRef<BrushSample[]>([]);
  const started = useRef(0);
  const travelled = useRef(0);
  const nextId = useRef(1);
  const now = useSharedValue(0);
  useFrameCallback(() => {
    now.set(Date.now());
  });

  // Forget strokes that have fully dried.
  useEffect(() => {
    const timer = setInterval(() => {
      const cutoff = Date.now() - DRY_MS;
      setStrokes((s) =>
        s.some((x) => x.painted < cutoff) ? s.filter((x) => x.painted >= cutoff) : s,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pathOf = (pts: readonly BrushSample[]): SkPath => {
    const poly = outline(pts, brush);
    const b = Skia.PathBuilder.Make();
    const n = poly.length / 2;
    if (n >= 3) {
      // Curves through the midpoints of the outline: soft, brush-like edges.
      const mid = (i: number, j: number) => [
        (poly[2 * i]! + poly[2 * j]!) / 2,
        (poly[2 * i + 1]! + poly[2 * j + 1]!) / 2,
      ];
      const [sx0, sy0] = mid(n - 1, 0);
      b.moveTo(sx0!, sy0!);
      for (let i = 0; i < n; i++) {
        const [mx, my] = mid(i, (i + 1) % n);
        b.quadTo(poly[2 * i]!, poly[2 * i + 1]!, mx!, my!);
      }
      b.close();
    }
    return b.build();
  };

  const begin = (x: number, y: number) => {
    chrome.touching(true);
    started.current = Date.now();
    travelled.current = 0;
    samples.current = [{ x, y, t: 0 }];
    haptics.tap();
    setLive(pathOf(samples.current));
  };
  const move = (x: number, y: number) => {
    const last = samples.current[samples.current.length - 1]!;
    const step = Math.hypot(x - last.x, y - last.y);
    if (step < 1.5) return;
    samples.current.push({ x, y, t: Date.now() - started.current });
    travelled.current += step;
    if (travelled.current > 70) {
      travelled.current = 0;
      haptics.tick();
      sounds.play('swish');
    }
    setLive(pathOf(samples.current));
  };
  const end = () => {
    chrome.touching(false);
    const path = pathOf(samples.current);
    const id = nextId.current++;
    setStrokes((s) => [...s, { id, path, painted: Date.now() }]);
    setLive(null);
  };

  const gesture = useToyGesture({
    onBegin: (p) => begin(p.x, p.y),
    onMove: (p) => move(p.x, p.y),
    onEnd: end,
  });

  const ink = look.colors[0]!;
  const current = guide >= 0 ? GUIDES[guide] : null;
  const square = Math.min(width - 48, height * 0.55);
  const sx = (width - square) / 2;
  const sy = (height - square) / 2 - 20;

  return (
    <ToyShell
      toy={TOY}
      background={look.background}
      actions={
        <IconButton
          icon={current ? 'grid' : 'grid-outline'}
          label={t('calligraphy.guide')}
          active={current !== null}
          onPress={() => setGuide((g) => (g + 1 >= GUIDES.length ? -1 : g + 1))}
        />
      }
      tools={
        <>
          {current && (
            <Pressy
              onPress={() => setGuide((g) => (g + 1 >= GUIDES.length ? -1 : g + 1))}
              accessibilityLabel={t('calligraphy.traceA11y', {
                char: current.char,
                meaning: t(`calligraphy.characters.${current.key}`),
              })}
              style={[
                styles.meaning,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <Text style={[styles.meaningChar, { color: theme.text }]}>{current.char}</Text>
              <AppText variant="heading">{t(`calligraphy.characters.${current.key}`)}</AppText>
            </Pressy>
          )}
          <LookBar toy="calligraphy" current={look} onChoose={choose} />
        </>
      }
    >
      {/* The stone slab. */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Fill color={look.background} />
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(width * 0.4, height * 0.35)}
            r={Math.max(width, height)}
            colors={[look.background, look.backgroundEdge]}
          />
        </Rect>
        <Fill opacity={0.1}>
          <FractalNoise freqX={0.35} freqY={0.9} octaves={4} />
        </Fill>
        {current && (
          <Group opacity={0.22} color={ink} style="stroke" strokeWidth={1.2}>
            <Rect x={sx} y={sy} width={square} height={square} />
            <Line p1={vec(sx, sy + square / 2)} p2={vec(sx + square, sy + square / 2)} />
            <Line p1={vec(sx + square / 2, sy)} p2={vec(sx + square / 2, sy + square)} />
            <Line p1={vec(sx, sy)} p2={vec(sx + square, sy + square)} />
            <Line p1={vec(sx + square, sy)} p2={vec(sx, sy + square)} />
          </Group>
        )}
      </Canvas>
      {current && (
        <View
          pointerEvents="none"
          style={[styles.ghostWrap, { top: sy, left: sx, width: square, height: square }]}
        >
          <Text
            allowFontScaling={false}
            style={[
              styles.ghost,
              { color: ink, fontSize: square * 0.78, lineHeight: square * 0.95 },
            ]}
          >
            {current.char}
          </Text>
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Canvas style={StyleSheet.absoluteFill}>
            {strokes.map((s) => (
              <DryingStroke key={s.id} stroke={s} now={now} color={ink} />
            ))}
            {live && (
              <Path path={live} color={ink} opacity={0.88}>
                <BlurMask blur={0.6} style="normal" />
              </Path>
            )}
          </Canvas>
        </View>
      </GestureDetector>
    </ToyShell>
  );
}

/** A stroke drying on the stone: it lightens and its edges soften as the water goes. */
function DryingStroke({
  stroke,
  now,
  color,
}: {
  stroke: WetStroke;
  now: SharedValue<number>;
  color: string;
}) {
  const wet = useDerivedValue(() => wetness(now.get() - stroke.painted));
  const opacity = useDerivedValue(() => 0.88 * wet.get());
  const blur = useDerivedValue(() => 0.6 + (1 - wet.get()) * 5);
  return (
    <Path path={stroke.path} color={color} opacity={opacity}>
      <BlurMask blur={blur} style="normal" />
    </Path>
  );
}

const styles = StyleSheet.create({
  ghostWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.13,
  },
  ghost: {
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Songti SC', default: 'serif' }),
  },
  meaning: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  meaningChar: { fontSize: 24 },
});
