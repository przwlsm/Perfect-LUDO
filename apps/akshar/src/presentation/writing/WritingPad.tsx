import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  DashPathEffect,
  DiscretePathEffect,
  Fill,
  FractalNoise,
  Group,
  Line,
  LinearGradient,
  Path,
  Points,
  RoundedRect,
  vec,
  type CanvasRef,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Pt } from '@/application/glyph/path';
import type { PenId } from '@/domain/entities/Cosmetics';
import type { BoxedGlyph } from '../glyph/useGlyph';
import { useSettings } from '../state/SettingsProvider';
import { PEN_LOOKS, inkColour, type SurfaceLook } from './looks';
import type { Ink } from './useInk';

/** What of the letter to show under the ink. */
export type GuideMode = 'trace' | 'hidden' | 'hint' | 'compare';

interface WritingPadProps {
  readonly width: number;
  readonly height: number;
  readonly ink: Ink;
  readonly surface: SurfaceLook;
  readonly pen: PenId;
  readonly glyph?: BoxedGlyph | null;
  readonly guide?: GuideMode;
  /** Glyph points the last attempt missed, shown as small warm dots. */
  readonly missed?: readonly Pt[] | null;
  /** Ruled lines across the whole pad (the free slate). */
  readonly ruled?: boolean;
  readonly disabled?: boolean;
  readonly canvasRef?: RefObject<CanvasRef | null>;
  readonly accessibilityLabel: string;
  readonly missedColour: string;
  readonly onStrokeStart?: () => void;
}

const RADIUS = 22;

/**
 * A sheet of paper (or slate) with a letter's guide on it and the learner's
 * ink on top. Everything is drawn with Skia; touches are one-finger pans
 * handled on the JS thread, which keeps the ink model in plain React state.
 */
export function WritingPad({
  width,
  height,
  ink,
  surface,
  pen,
  glyph,
  guide = 'trace',
  missed,
  ruled,
  disabled,
  canvasRef,
  accessibilityLabel,
  missedColour,
  onStrokeStart,
}: WritingPadProps) {
  const { haptics, sounds, calmMotion } = useSettings();
  const look = PEN_LOOKS[pen];
  const colour = inkColour(pen, surface);
  const travelled = useRef(0);

  // The newest stroke shines wet for a moment, then dries.
  const sheen = useSharedValue(0);
  const sheenOpacity = useDerivedValue(() => sheen.get() * 0.5);
  const lastStroke = ink.last;
  useEffect(() => {
    if (!lastStroke) return;
    sheen.set(1);
    sheen.set(withTiming(0, { duration: 1600 }));
  }, [lastStroke, sheen]);

  // A hint shows the letter, then lets it fade away again.
  const hint = useSharedValue(0);
  useEffect(() => {
    if (guide === 'hint') {
      hint.set(1);
      hint.set(withTiming(0, { duration: calmMotion ? 2400 : 2600 }));
    } else {
      hint.set(0);
    }
  }, [guide, hint, calmMotion]);
  const hintGuide = useDerivedValue(() => Math.min(1, hint.get() * 1.6));

  const handlers = useRef({ ink, disabled, onStrokeStart });
  useEffect(() => {
    handlers.current = { ink, disabled, onStrokeStart };
  });

  const gesture = useMemo(
    () =>
      // The builder only stores these callbacks; gesture events call them later.
      /* eslint-disable react-hooks/refs */
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .runOnJS(true)
        .onBegin((e) => {
          if (handlers.current.disabled) return;
          travelled.current = 0;
          handlers.current.onStrokeStart?.();
          handlers.current.ink.begin(e.x, e.y);
          haptics.tick();
        })
        .onUpdate((e) => {
          if (handlers.current.disabled) return;
          travelled.current += handlers.current.ink.move(e.x, e.y);
          if (travelled.current > 54) {
            travelled.current = 0;
            haptics.tick();
            sounds.play('scratch');
          }
        })
        .onFinalize(() => handlers.current.ink.end()),
    /* eslint-enable react-hooks/refs */
    [haptics, sounds],
  );

  const coarseMissed = useMemo(() => {
    if (!missed || !glyph) return [];
    const step = glyph.shape.cell * 3;
    return missed
      .filter(
        (p) =>
          Math.round(p.x / glyph.shape.cell) % 3 === 0 &&
          Math.round(p.y / glyph.shape.cell) % 3 === 0,
      )
      .map((p) => vec(Math.round(p.x / step) * step, Math.round(p.y / step) * step));
  }, [missed, glyph]);

  const dots = useMemo(() => (glyph ? glyph.shape.dots.map((d) => vec(d.x, d.y)) : []), [glyph]);
  const dotSize = glyph ? Math.max(3.5, Math.min(7, glyph.shape.halfWidth * 0.34)) : 4;
  const rules = useMemo(() => {
    if (!ruled) return [];
    const gap = Math.max(56, Math.round(height / 7));
    const ys: number[] = [];
    for (let y = gap; y < height - 12; y += gap) ys.push(y);
    return ys;
  }, [ruled, height]);

  const inkPaint = (path: Ink['settled'], opacity = look.opacity) => (
    <Path path={path} color={colour} opacity={opacity}>
      {look.shimmer && (
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={[...(surface.dark ? look.shimmer.dark : look.shimmer.light)]}
        />
      )}
      {look.rough > 0 && <DiscretePathEffect length={3} deviation={look.rough} />}
    </Path>
  );

  const g = glyph;
  const showGuide = g && guide === 'trace';
  const showCompare = g && guide === 'compare';
  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.pad, { width, height, borderRadius: RADIUS }]}
        collapsable={false}
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        <Canvas ref={canvasRef} style={StyleSheet.absoluteFill}>
          <RoundedRect x={0} y={0} width={width} height={height} r={RADIUS}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(width, height)}
              colors={[...surface.paper]}
            />
          </RoundedRect>
          <Group clip={{ rect: { x: 0, y: 0, width, height }, rx: RADIUS, ry: RADIUS }}>
            <Fill opacity={surface.grain}>
              <FractalNoise freqX={0.9} freqY={0.9} octaves={3} />
            </Fill>
          </Group>
          {rules.map((y) => (
            <Line
              key={y}
              p1={vec(18, y)}
              p2={vec(width - 18, y)}
              color={surface.rule}
              strokeWidth={1}
            />
          ))}
          {g && (
            <Group color={surface.rule} style="stroke" strokeWidth={1}>
              <Line p1={vec(16, g.bounds.y)} p2={vec(width - 16, g.bounds.y)}>
                <DashPathEffect intervals={[7, 7]} />
              </Line>
              <Line
                p1={vec(16, g.bounds.y + g.bounds.height)}
                p2={vec(width - 16, g.bounds.y + g.bounds.height)}
              >
                <DashPathEffect intervals={[7, 7]} />
              </Line>
              <Line p1={vec(width / 2, 14)} p2={vec(width / 2, height - 14)} opacity={0.6}>
                <DashPathEffect intervals={[3, 9]} />
              </Line>
            </Group>
          )}
          {showGuide && (
            <Group>
              <Path path={g.path} color={surface.guide} />
              <Points
                points={dots}
                mode="points"
                strokeWidth={dotSize}
                strokeCap="round"
                color={surface.dots}
              />
            </Group>
          )}
          {g && guide === 'hint' && (
            <Group opacity={hintGuide}>
              <Path path={g.path} color={surface.guide} />
              <Points
                points={dots}
                mode="points"
                strokeWidth={dotSize}
                strokeCap="round"
                color={surface.dots}
              />
            </Group>
          )}
          {showCompare && (
            <Group>
              <Path path={g.path} color={surface.guide} />
            </Group>
          )}
          {inkPaint(ink.settled)}
          {ink.last && (
            <Path
              path={ink.last}
              color="#ffffff"
              opacity={sheenOpacity}
              style="stroke"
              strokeWidth={1.4}
              transform={[{ translateX: -0.7 }, { translateY: -0.9 }]}
            >
              <BlurMask blur={1.1} style="normal" />
            </Path>
          )}
          {ink.live && inkPaint(ink.live)}
          {ink.live && (
            <Path
              path={ink.live}
              color="#ffffff"
              opacity={0.4}
              style="stroke"
              strokeWidth={1.3}
              transform={[{ translateX: -0.7 }, { translateY: -0.9 }]}
            >
              <BlurMask blur={1.1} style="normal" />
            </Path>
          )}
          {coarseMissed.length > 0 && (
            <Points
              points={coarseMissed}
              mode="points"
              strokeWidth={6}
              strokeCap="round"
              color={missedColour}
              opacity={0.85}
            />
          )}
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pad: { overflow: 'hidden' },
});
