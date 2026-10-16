import { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import {
  BlendMode,
  BlurMask,
  BlurStyle,
  Canvas,
  createPicture,
  DashPathEffect,
  DiscretePathEffect,
  Group,
  PaintStyle,
  Path,
  Picture,
  Skia,
  StrokeCap,
  StrokeJoin,
  SweepGradient,
  useFont,
  vec,
  type CanvasRef,
  type SkCanvas,
  type SkFont,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { random, withAlpha } from 'app-kit';
import { CROSS, NO_CLUE, type Puzzle } from '@/domain/entities/Board';
import type { LookInk } from '@/domain/entities/Look';
import { edgeBetween, gridOf } from '@/application/engine/grid';
import {
  branchingDots,
  brokenCells,
  loopOrder,
  satisfiedCells,
  type Marks,
} from '@/application/engine/rules';
import { autoCrosses } from '@/application/game/play';
import type { Palette } from '../theme/palette';
import {
  cellXY,
  clampPan,
  dotXY,
  edgeMid,
  MAX_ZOOM,
  nearestDot,
  nearestEdge,
  walkDots,
  type BoardGeom,
} from './geometry';
import { bloomOf, crossesPath, edgesPath, kolamPath, linesPath } from './paint';

const CLUE_FONT = require('@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf');

/** What a hint lights up while it shows. */
export interface HintGlow {
  readonly key: number;
  readonly edges: readonly number[];
  readonly cells: readonly number[];
  readonly dots: readonly number[];
}

export interface KolamBoardProps {
  readonly puzzle: Puzzle;
  readonly marks: Marks;
  readonly geom: BoardGeom;
  readonly ink: LookInk;
  readonly palette: Palette;
  readonly showErrors: boolean;
  readonly autoCross: boolean;
  readonly calm: boolean;
  readonly won: boolean;
  readonly zoomable: boolean;
  readonly glow?: HintGlow | null;
  /** Draws the reveal straight away (previews, the tutorial). */
  readonly instant?: boolean;
  /** Read-only boards (previews) take no touches. */
  readonly interactive?: boolean;
  readonly onTapEdge?: (edge: number) => void;
  /** One side crossed by a drag; `first` starts a new stroke. */
  readonly onStroke?: (edge: number, first: boolean) => void;
  readonly onStrokeEnd?: () => void;
  /** A finger is down on the board (a page can stop scrolling meanwhile). */
  readonly onTouch?: (active: boolean) => void;
  /** Labels for screen readers (omitted on previews). */
  readonly edgeLabel?: (edge: number) => string;
  readonly cellLabel?: (cell: number) => string;
  /** A zoom asked for by a button: `to` is the scale (1 shows the whole board); `n` changes per ask. */
  readonly zoom?: { readonly n: number; readonly to: number };
  /** Told whether the board is zoomed in, after a pinch or a button. */
  readonly onZoomed?: (zoomed: boolean) => void;
}

/**
 * The play surface: a swept floor, a grid of rice-flour dots, the numbers,
 * the line the player draws and the ✕ marks, all in one Skia canvas. Taps
 * cycle a side, drags draw along the dots, pinches zoom on big boards. When
 * the board is solved the straight line flows into a kolam: corners turn to
 * curves, rice dots and flowers bloom, and marigold petals fall.
 */
export const KolamBoard = forwardRef<CanvasRef, KolamBoardProps>(function KolamBoard(props, ref) {
  const { puzzle, marks, geom, ink, palette, showErrors, autoCross, calm, won, glow } = props;
  const grid = gridOf(puzzle.rows, puzzle.cols);
  const c = geom.cell;
  const lineW = Math.max(2.6, Math.min(7, c * 0.1));
  const centre = vec(geom.bx + (geom.cols * c) / 2, geom.by + (geom.rows * c) / 2);
  const dawn = palette.scheme === 'dawn';
  const floorInk = ink.floor ?? palette.floor;
  const multi = ink.line.length > 1;
  const sweep = multi ? [...ink.line, ink.line[0]!] : null;
  const font = useFont(CLUE_FONT, Math.round(Math.max(12, Math.min(34, c * 0.52))));

  // ---- the floor and the dots: change only with the board and the theme
  const floorPic = useMemo(
    () => createPicture((canvas) => drawFloor(canvas, geom, floorInk, dawn)),
    [geom, floorInk, dawn],
  );
  const dotsPic = useMemo(
    () =>
      createPicture((canvas) => {
        const p = Skia.Paint();
        p.setAntiAlias(true);
        p.setColor(Skia.Color(ink.dot));
        p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 0.5, true));
        const r = Math.max(1.8, c * 0.055);
        for (let d = 0; d < grid.dotCount; d++) {
          const { x, y } = dotXY(geom, grid, d);
          canvas.drawCircle(x, y, r, p);
        }
      }),
    [geom, grid, ink.dot, c],
  );

  // ---- what the player has drawn
  const lines = useMemo(() => linesPath(geom, grid, marks), [geom, grid, marks]);
  const auto = useMemo(
    () => (autoCross && !won ? autoCrosses(puzzle, marks) : new Set<number>()),
    [autoCross, won, puzzle, marks],
  );
  const marksPic = useMemo(
    () =>
      createPicture((canvas) => {
        const crossed: number[] = [];
        for (let e = 0; e < grid.edgeCount; e++) if (marks[e] === CROSS) crossed.push(e);
        const p = Skia.Paint();
        p.setAntiAlias(true);
        p.setStyle(PaintStyle.Stroke);
        p.setStrokeCap(StrokeCap.Round);
        p.setStrokeWidth(Math.max(1.4, c * 0.03));
        p.setColor(Skia.Color(palette.cross));
        canvas.drawPath(crossesPath(geom, grid, crossed), p);
        if (auto.size) {
          p.setColor(Skia.Color(withAlpha(palette.cross, 0.45)));
          canvas.drawPath(crossesPath(geom, grid, auto), p);
        }
        if (showErrors) {
          const bad = branchingDots(puzzle, marks);
          p.setColor(Skia.Color(palette.clueError));
          p.setStrokeWidth(Math.max(1.6, c * 0.04));
          for (const d of bad) {
            const { x, y } = dotXY(geom, grid, d);
            canvas.drawCircle(x, y, c * 0.17, p);
          }
        }
      }),
    [marks, auto, grid, geom, palette, c, showErrors, puzzle],
  );
  const linesPic = useMemo(
    () =>
      createPicture((canvas) => {
        drawPowder(canvas, lines, lineW, ink.line, sweep ? centre : null, dawn, ink.sheen);
      }),
    // `sweep` and `centre` follow from the other inputs.
    [lines, lineW, ink, dawn, geom], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const cluePic = useMemo(
    () =>
      createPicture((canvas) => {
        if (font) drawClues(canvas, puzzle, marks, geom, font, palette, showErrors);
      }),
    [font, puzzle, marks, geom, palette, showErrors],
  );

  // ---- a hint's glow, pulsing gently
  const clock = useSharedValue(0);
  // The clock only runs while a hint glows; an idle board draws nothing new.
  const ticker = useFrameCallback((frame) => {
    clock.set(frame.timeSinceFirstFrame / 1000);
  }, false);
  const pulsing = !!glow && !calm && !won;
  useEffect(() => {
    ticker.setActive(pulsing);
  }, [pulsing, ticker]);
  const glowPic = useMemo(
    () =>
      glow
        ? createPicture((canvas) => {
            const p = Skia.Paint();
            p.setAntiAlias(true);
            p.setColor(Skia.Color(withAlpha(palette.hintGlow, 0.2)));
            for (const cell of glow.cells) {
              const { x, y } = cellXY(geom, puzzle.cols, cell);
              canvas.drawRRect(
                Skia.RRectXY(
                  Skia.XYWHRect(x - c * 0.44, y - c * 0.44, c * 0.88, c * 0.88),
                  c * 0.2,
                  c * 0.2,
                ),
                p,
              );
            }
            p.setColor(Skia.Color(palette.hintGlow));
            p.setStyle(PaintStyle.Stroke);
            p.setStrokeCap(StrokeCap.Round);
            p.setStrokeWidth(lineW * 3.2);
            p.setAlphaf(0.5);
            p.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, lineW, true));
            canvas.drawPath(edgesPath(geom, grid, glow.edges), p);
            p.setMaskFilter(null);
            p.setAlphaf(0.9);
            p.setStrokeWidth(Math.max(1.5, c * 0.035));
            for (const d of glow.dots) {
              const { x, y } = dotXY(geom, grid, d);
              canvas.drawCircle(x, y, c * 0.2, p);
            }
          })
        : null,
    [glow, geom, grid, palette.hintGlow, puzzle.cols, c, lineW],
  );

  // ---- the reveal
  const order = useMemo(() => (won ? loopOrder(puzzle, marks) : null), [won, puzzle, marks]);
  const kolam = useMemo(() => (order ? kolamPath(geom, grid, order) : null), [order, geom, grid]);
  const bloom = useMemo(
    () => (won ? bloomOf(puzzle, marks, geom) : null),
    [won, puzzle, marks, geom],
  );
  const win = useSharedValue(props.instant && won ? 14 : -1);
  useEffect(() => {
    if (!won) {
      win.set(-1);
      return;
    }
    if (props.instant) {
      win.set(14);
      return;
    }
    win.set(0);
    win.set(
      calm
        ? withTiming(4, { duration: 1100 })
        : withTiming(14, { duration: 14_000, easing: Easing.linear }),
    );
  }, [won, calm, win, props.instant]);
  // Everything drawn during play, faded out layer by layer as the kolam takes over.
  // (A Picture ignores a Group's opacity, so each layer is composited here.)
  const showGlow = !!glowPic && !won;
  const layers = useDerivedValue(() => {
    const t = win.get();
    const fade = (from: number, over: number) => (t < 0 ? 1 : Math.max(0, 1 - (t - from) / over));
    const pulse = calm ? 0.85 : 0.65 + 0.35 * Math.sin(clock.get() * 3.2);
    return createPicture((canvas) => {
      const layer = (picture: typeof dotsPic | null, alpha: number) => {
        if (!picture || alpha <= 0) return;
        if (alpha >= 1) {
          canvas.drawPicture(picture);
          return;
        }
        const paint = Skia.Paint();
        paint.setAlphaf(alpha);
        canvas.saveLayer(paint);
        canvas.drawPicture(picture);
        canvas.restore();
      };
      const play = fade(0, 0.5);
      layer(dotsPic, play);
      layer(marksPic, play);
      if (showGlow) layer(glowPic, pulse);
      layer(linesPic, fade(0.45, 0.9));
      layer(cluePic, fade(0, 0.9));
    });
  });
  const kolamEnd = useDerivedValue(() => {
    const t = win.get();
    if (t < 0) return 0;
    const k = Math.min(1, Math.max(0, (t - 0.2) / 1.7));
    return 1 - (1 - k) ** 3;
  });
  const kolamShow = useDerivedValue(() => (win.get() < 0 ? 0 : 1));
  const petalColours = palette.petals;
  const bloomColours = ink.bloom;
  const dotColour = ink.dot;
  const lineColour = ink.line[0]!;
  const bloomPic = useDerivedValue(() => {
    const t = win.get();
    return createPicture((canvas) => {
      if (t < 0 || !bloom) return;
      drawBloom(
        canvas,
        t,
        bloom,
        c,
        dotColour,
        lineColour,
        bloomColours,
        petalColours,
        calm,
        geom.floor,
      );
    });
  });

  // ---- zoom
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const transform = useDerivedValue(() => [
    { translateX: tx.get() },
    { translateY: ty.get() },
    { scale: scale.get() },
  ]);
  const zoomTo = (s1: number) => {
    const s0 = scale.get();
    // Zoom about the middle of the view.
    const fx = geom.width / 2;
    const fy = geom.height / 2;
    const next =
      s1 <= 1
        ? { tx: 0, ty: 0 }
        : clampPan(geom, s1, fx - (fx - tx.get()) * (s1 / s0), fy - (fy - ty.get()) * (s1 / s0));
    scale.set(withSpring(s1, { damping: 20 }));
    tx.set(withSpring(next.tx, { damping: 20 }));
    ty.set(withSpring(next.ty, { damping: 20 }));
  };
  useEffect(() => {
    if (won) zoomTo(1);
    // zoomTo only touches shared values.
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const z = props.zoom;
    if (!z || z.n === 0) return;
    zoomTo(Math.min(MAX_ZOOM, Math.max(1, z.to)));
    props.onZoomed?.(z.to > 1.02);
  }, [props.zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Labelled views for every side are only worth their cost with a screen reader on.
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (live) setScreenReader(on);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  // ---- touch
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const stroke = useRef<{ dot: number; drew: boolean } | null>(null);
  const gesture = useMemo(() => {
    // The builder only stores these callbacks; gesture events call them
    // later, never during render.
    /* eslint-disable react-hooks/refs */
    const toBoard = (x: number, y: number) => ({
      x: (x - tx.get()) / scale.get(),
      y: (y - ty.get()) / scale.get(),
    });
    const draw = Gesture.Pan()
      .minDistance(5)
      .maxPointers(1)
      .runOnJS(true)
      .onBegin(() => latest.current.onTouch?.(true))
      .onStart((e) => {
        const p = latest.current;
        if (p.won || p.interactive === false) return;
        const s = toBoard(e.x - e.translationX, e.y - e.translationY);
        const dot = nearestDot(p.geom, s.x, s.y, 0.75);
        stroke.current = dot >= 0 ? { dot, drew: false } : null;
      })
      .onUpdate((e) => {
        const st = stroke.current;
        const p = latest.current;
        if (!st || p.won) return;
        const at = toBoard(e.x, e.y);
        const dot = nearestDot(p.geom, at.x, at.y, 0.36);
        if (dot < 0 || dot === st.dot) return;
        const g = gridOf(p.geom.rows, p.geom.cols);
        let prev = st.dot;
        for (const next of walkDots(p.geom.cols, st.dot, dot)) {
          const edge = edgeBetween(g, prev, next);
          if (edge >= 0) {
            p.onStroke?.(edge, !st.drew);
            st.drew = true;
          }
          prev = next;
        }
        st.dot = dot;
      })
      .onFinalize(() => {
        if (stroke.current?.drew) latest.current.onStrokeEnd?.();
        stroke.current = null;
        latest.current.onTouch?.(false);
      });
    const tap = Gesture.Tap()
      .maxDistance(12)
      .runOnJS(true)
      .onEnd((e) => {
        const p = latest.current;
        if (p.won || p.interactive === false) return;
        const at = toBoard(e.x, e.y);
        const edge = nearestEdge(p.geom, at.x, at.y);
        if (edge >= 0) p.onTapEdge?.(edge);
      });
    const start = { s: 1, tx: 0, ty: 0, fx: 0, fy: 0 };
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart((e) => {
        start.s = scale.get();
        start.tx = tx.get();
        start.ty = ty.get();
        start.fx = e.focalX;
        start.fy = e.focalY;
      })
      .onUpdate((e) => {
        const p = latest.current;
        if (!p.zoomable || p.won) return;
        const s1 = Math.min(MAX_ZOOM, Math.max(1, start.s * e.scale));
        const k = s1 / start.s;
        // The point under the fingers stays under them; moving them pans.
        const next = clampPan(
          p.geom,
          s1,
          e.focalX - (start.fx - start.tx) * k,
          e.focalY - (start.fy - start.ty) * k,
        );
        scale.set(s1);
        tx.set(next.tx);
        ty.set(next.ty);
      })
      .onEnd(() => latest.current.onZoomed?.(scale.get() > 1.02));
    /* eslint-enable react-hooks/refs */
    return Gesture.Race(pinch, Gesture.Exclusive(draw, tap));
  }, [scale, tx, ty]);

  const canvas = (
    <Canvas ref={ref} style={{ width: geom.width, height: geom.height }}>
      <Group transform={transform}>
        <Picture picture={floorPic} />
        <Picture picture={layers} />
        {kolam && (
          <Group opacity={kolamShow}>
            <Path
              path={kolam}
              start={0}
              end={kolamEnd}
              style="stroke"
              strokeWidth={lineW * 3.4}
              strokeCap="round"
              color={dawn ? ink.line[0] : withAlpha(ink.line[0]!, 0.6)}
              opacity={dawn ? 0.2 : 0.12}
            >
              <BlurMask blur={lineW * 1.3} style="normal" />
            </Path>
            <Path
              path={kolam}
              start={0}
              end={kolamEnd}
              style="stroke"
              strokeWidth={lineW * 1.25}
              strokeCap="round"
              strokeJoin="round"
              color={ink.line[0]}
            >
              {sweep && <SweepGradient c={centre} colors={sweep} />}
              <BlurMask blur={0.8} style="normal" respectCTM />
              <DiscretePathEffect length={4} deviation={lineW * 0.14} seed={11} />
            </Path>
            <Path
              path={kolam}
              start={0}
              end={kolamEnd}
              style="stroke"
              strokeWidth={Math.max(1, lineW * 0.28)}
              strokeCap="round"
              color={dawn ? 'rgba(255,255,255,0.55)' : 'rgba(255,236,214,0.18)'}
            >
              <DashPathEffect intervals={[0.6, lineW * 0.9]} />
            </Path>
            {ink.sheen && (
              <Path
                path={kolam}
                start={0}
                end={kolamEnd}
                style="stroke"
                strokeWidth={Math.max(1, lineW * 0.32)}
                strokeCap="round"
                color={ink.sheen}
                opacity={0.85}
              />
            )}
          </Group>
        )}
        {bloom && <Picture picture={bloomPic} />}
      </Group>
    </Canvas>
  );

  if (props.interactive === false) {
    return <View style={{ width: geom.width, height: geom.height }}>{canvas}</View>;
  }
  return (
    <View style={{ width: geom.width, height: geom.height }}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {canvas}
        </View>
      </GestureDetector>
      {props.edgeLabel && (Platform.OS === 'web' || screenReader) && <A11yLayer {...props} />}
    </View>
  );
});

/**
 * For screen readers: one labelled view per side (double-tap cycles it) and
 * one per numbered square. They sit where the board is drawn unzoomed and
 * take no touches of their own. Each view is memoised, so a move re-renders
 * only the side it changed.
 */
function A11yLayer({ puzzle, geom, edgeLabel, cellLabel, onTapEdge }: KolamBoardProps) {
  const grid = gridOf(puzzle.rows, puzzle.cols);
  const c = geom.cell;
  const tap = useRef(onTapEdge);
  useEffect(() => {
    tap.current = onTapEdge;
  });
  const onTap = useMemo(() => (e: number) => tap.current?.(e), []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {puzzle.clues.map((clue, cell) => {
        if (clue === NO_CLUE || !cellLabel) return null;
        const { x, y } = cellXY(geom, puzzle.cols, cell);
        return (
          <Hit
            key={`c${cell}`}
            label={cellLabel(cell)}
            x={x - c * 0.2}
            y={y - c * 0.2}
            w={c * 0.4}
            h={c * 0.4}
          />
        );
      })}
      {Array.from({ length: grid.edgeCount }, (_, e) => {
        const { x, y } = edgeMid(geom, grid, e);
        const horizontal = e < grid.horizontalCount;
        const w = horizontal ? c * 0.6 : c * 0.3;
        const h = horizontal ? c * 0.3 : c * 0.6;
        return (
          <Hit
            key={e}
            edge={e}
            label={edgeLabel?.(e) ?? ''}
            x={x - w / 2}
            y={y - h / 2}
            w={w}
            h={h}
            onTap={onTap}
          />
        );
      })}
    </View>
  );
}

interface HitProps {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly edge?: number;
  readonly onTap?: (edge: number) => void;
}

const Hit = memo(function Hit({ label, x, y, w, h, edge, onTap }: HitProps) {
  const act = edge !== undefined && onTap ? () => onTap(edge) : undefined;
  return (
    <View
      accessible
      accessibilityRole={act ? 'button' : 'text'}
      accessibilityLabel={label}
      onAccessibilityTap={act}
      accessibilityActions={act ? [{ name: 'activate' }] : undefined}
      onAccessibilityAction={act}
      style={[styles.hit, { left: x, top: y, width: w, height: h }]}
    />
  );
});

/** The swept doorstep: a soft gradient of earth (or cream), a faint grain, a damp edge. */
function drawFloor(
  canvas: SkCanvas,
  geom: BoardGeom,
  floor: readonly [string, string],
  dawn: boolean,
): void {
  const f = geom.floor;
  const r = geom.cell * 0.5;
  const rect = Skia.RRectXY(Skia.XYWHRect(f.x, f.y, f.w, f.h), r, r);
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: f.x + f.w / 2, y: f.y + f.h * 0.42 },
      Math.max(f.w, f.h) * 0.75,
      [Skia.Color(floor[0]), Skia.Color(floor[1])],
      null,
      0,
    ),
  );
  canvas.drawRRect(rect, p);
  p.setShader(null);
  // Grain: tiny specks of grit and flour dust.
  const rnd = random(Math.round(f.w * 13 + f.h));
  const count = Math.round((f.w * f.h) / 90);
  canvas.save();
  canvas.clipRRect(rect, 0, true);
  for (let i = 0; i < count; i++) {
    p.setColor(
      Skia.Color(
        dawn
          ? `rgba(255, 236, 210, ${0.02 + rnd() * 0.05})`
          : `rgba(110, 60, 20, ${0.02 + rnd() * 0.05})`,
      ),
    );
    canvas.drawCircle(f.x + rnd() * f.w, f.y + rnd() * f.h, 0.4 + rnd() * 0.9, p);
  }
  canvas.restore();
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1);
  p.setColor(Skia.Color(dawn ? 'rgba(255, 228, 196, 0.08)' : 'rgba(90, 40, 20, 0.12)'));
  canvas.drawRRect(rect, p);
}

/** Lines in rice flour: a soft body with ragged edges, a grain of white, a faint glow. */
function drawPowder(
  canvas: SkCanvas,
  path: ReturnType<typeof linesPath>,
  w: number,
  colours: readonly string[],
  sweepCentre: { x: number; y: number } | null,
  dawn: boolean,
  sheen: string | null,
): void {
  const halo = Skia.Paint();
  halo.setAntiAlias(true);
  halo.setStyle(PaintStyle.Stroke);
  halo.setStrokeCap(StrokeCap.Round);
  halo.setStrokeWidth(w * 3);
  halo.setColor(Skia.Color(colours[0]!));
  halo.setAlphaf(dawn ? 0.14 : 0.08);
  halo.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, w * 1.1, true));
  canvas.drawPath(path, halo);

  const body = Skia.Paint();
  body.setAntiAlias(true);
  body.setStyle(PaintStyle.Stroke);
  body.setStrokeCap(StrokeCap.Round);
  body.setStrokeJoin(StrokeJoin.Round);
  body.setStrokeWidth(w);
  body.setColor(Skia.Color(colours[0]!));
  if (sweepCentre) {
    body.setShader(
      Skia.Shader.MakeSweepGradient(
        sweepCentre.x,
        sweepCentre.y,
        [...colours, colours[0]!].map((col) => Skia.Color(col)),
        null,
        0,
      ),
    );
  }
  body.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 0.7, true));
  const jitter = Skia.PathEffect.MakeDiscrete(4, w * 0.13, 7);
  if (jitter) body.setPathEffect(jitter);
  canvas.drawPath(path, body);

  const grain = Skia.Paint();
  grain.setAntiAlias(true);
  grain.setStyle(PaintStyle.Stroke);
  grain.setStrokeCap(StrokeCap.Round);
  grain.setStrokeWidth(Math.max(0.8, w * 0.24));
  grain.setColor(Skia.Color(dawn ? 'rgba(255,255,255,0.5)' : 'rgba(255,236,214,0.16)'));
  grain.setPathEffect(Skia.PathEffect.MakeDash([0.6, w * 0.9], 0));
  canvas.drawPath(path, grain);

  if (sheen) {
    const shine = Skia.Paint();
    shine.setAntiAlias(true);
    shine.setStyle(PaintStyle.Stroke);
    shine.setStrokeCap(StrokeCap.Round);
    shine.setStrokeWidth(Math.max(0.8, w * 0.28));
    shine.setColor(Skia.Color(sheen));
    shine.setAlphaf(0.8);
    canvas.drawPath(path, shine);
  }
}

/** The numbers: quiet once satisfied, red when they can no longer be right. */
function drawClues(
  canvas: SkCanvas,
  puzzle: Puzzle,
  marks: Marks,
  geom: BoardGeom,
  font: SkFont,
  palette: Palette,
  showErrors: boolean,
): void {
  const done = satisfiedCells(puzzle, marks);
  const broken = new Set(showErrors ? brokenCells(puzzle, marks) : []);
  const p = Skia.Paint();
  p.setAntiAlias(true);
  // Lining figures sit on the baseline and rise about 0.7 of the size
  // (measureText is not available in a browser, so this is worked out).
  const mid = -font.getSize() * 0.36;
  const glyph = new Map<number, { w: number; mid: number }>();
  for (let n = 0; n <= 3; n++) glyph.set(n, { w: font.getTextWidth(String(n)), mid });
  puzzle.clues.forEach((clue, cell) => {
    if (clue === NO_CLUE) return;
    const { x, y } = cellXY(geom, puzzle.cols, cell);
    const g = glyph.get(clue)!;
    p.setColor(
      Skia.Color(
        broken.has(cell)
          ? palette.clueError
          : done.has(cell) && clue > 0
            ? palette.clueDone
            : palette.clue,
      ),
    );
    canvas.drawText(String(clue), x - g.w / 2, y - g.mid, p, font);
  });
}

/**
 * The bloom after a solve, drawn each frame from `t` (seconds since the
 * solve): rice dots pop in each lobe with a ring around each, small
 * flowers open, and marigold petals drift down across the floor.
 */
function drawBloom(
  canvas: SkCanvas,
  t: number,
  bloom: ReturnType<typeof bloomOf>,
  c: number,
  dot: string,
  line: string,
  colours: readonly string[],
  petals: readonly string[],
  calm: boolean,
  floor: BoardGeom['floor'],
): void {
  'worklet';
  const p = Skia.Paint();
  p.setAntiAlias(true);
  const pop = (age: number) => {
    if (age <= 0) return 0;
    if (calm) return Math.min(1, age / 0.3);
    const k = Math.min(1, age / 0.45) - 1;
    // A little overshoot, like a pinch of flour landing.
    return 1 + 2.7 * k * k * k + 1.7 * k * k;
  };
  p.setColor(Skia.Color(dot));
  const ring = Skia.Paint();
  ring.setAntiAlias(true);
  ring.setStyle(PaintStyle.Stroke);
  ring.setStrokeWidth(Math.max(1, c * 0.022));
  ring.setColor(Skia.Color(line));
  for (let i = 0; i < bloom.pulli.length; i += 3) {
    const age = t - bloom.pulli[i + 2]!;
    const s = pop(age);
    if (s <= 0) continue;
    canvas.drawCircle(bloom.pulli[i]!, bloom.pulli[i + 1]!, c * 0.075 * s, p);
    // A thin flour ring opens around each dot, the way kolam lines circle the pulli.
    const open = Math.min(1, Math.max(0, (age - 0.25) / 0.5));
    if (open > 0) {
      ring.setAlphaf(0.55 * open);
      canvas.drawCircle(bloom.pulli[i]!, bloom.pulli[i + 1]!, c * (0.12 + 0.09 * open), ring);
    }
  }
  for (let i = 0; i < bloom.flowers.length; i += 4) {
    const s = pop(t - bloom.flowers[i + 2]!);
    if (s <= 0) continue;
    const x = bloom.flowers[i]!;
    const y = bloom.flowers[i + 1]!;
    const colour = colours[(bloom.flowers[i + 3]! % (colours.length - 1)) + 1] ?? colours[0]!;
    p.setColor(Skia.Color(colour));
    const r = c * 0.13 * s;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + (calm ? 0 : t * 0.15);
      canvas.drawCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.62, p);
    }
    p.setColor(Skia.Color(colours[0]!));
    canvas.drawCircle(x, y, r * 0.55, p);
    p.setColor(Skia.Color(dot));
  }
  if (calm) return;
  p.setBlendMode(BlendMode.SrcOver);
  const fall = floor.h + c * 2;
  for (let i = 0; i < bloom.petals.length; i += 6) {
    const age = t - bloom.petals[i + 1]!;
    if (age <= 0) continue;
    const y = floor.y + c * 0.25 + age * bloom.petals[i + 2]! * c * 1.6;
    if (y > floor.y + fall) continue;
    const phase = bloom.petals[i + 3]!;
    const x = bloom.petals[i]! + Math.sin(age * 1.4 + phase) * c * 0.5;
    const fade =
      Math.min(1, age / 0.7) * Math.max(0, Math.min(1, (floor.y + floor.h - y) / (c * 1.2)));
    if (fade <= 0) continue;
    const size = c * 0.11 * bloom.petals[i + 5]!;
    p.setColor(Skia.Color(petals[bloom.petals[i + 4]! % petals.length]!));
    p.setAlphaf(0.92 * fade);
    canvas.save();
    canvas.translate(x, y);
    canvas.rotate(((age * 1.7 + phase) * 180) / Math.PI, 0, 0);
    canvas.scale(1, 0.45 + 0.35 * Math.abs(Math.sin(age * 2.1 + phase)));
    canvas.drawOval(Skia.XYWHRect(-size, -size * 0.55, size * 2, size * 1.1), p);
    canvas.restore();
  }
}

const styles = StyleSheet.create({
  hit: { position: 'absolute' },
});
