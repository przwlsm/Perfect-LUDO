import { forwardRef, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  createPicture,
  Group,
  Picture,
  Skia,
  TileMode,
  type CanvasRef,
  type SkPicture,
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import type { Pos } from '@/application/engine/state';
import { FONTS, type Palette } from '../theme/palette';
import { INKS } from './inks';
import type { CounterLayout } from './layout';
import type { CupLook } from './looks';
import {
  cupGeo,
  drawArrow,
  drawBurst,
  drawCupBack,
  drawCupFront,
  drawGlow,
  drawLid,
  drawLiquid,
  drawSteam,
  drawStream,
  type Geo,
} from './paint';

/** A pour being shown: what moved, and the two cups before (source) and after (target). */
export interface PourAnim {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly ing: number;
  readonly amount: number;
  /** The source cup's layers before the pour. */
  readonly source: readonly number[];
  /** The target cup's layers after the pour. */
  readonly target: readonly number[];
}

export const POUR_MS = 980;
export const CALM_POUR_MS = 320;

interface CounterProps {
  readonly pos: Pos;
  readonly layout: CounterLayout;
  readonly look: CupLook;
  readonly palette: Palette;
  readonly symbols: boolean;
  readonly calm: boolean;
  readonly selected: number | null;
  readonly hint: { readonly from: number; readonly to: number } | null;
  readonly anim: PourAnim | null;
  readonly shake: { readonly cup: number; readonly id: number } | null;
  readonly burst: { readonly cup: number; readonly id: number } | null;
  readonly served: readonly boolean[];
  readonly label: (i: number) => string;
  readonly readyText: string;
  readonly onTapCup: (i: number) => void;
  readonly onTapCounter: () => void;
}

function ease(t: number): number {
  'worklet';
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp01(x: number): number {
  'worklet';
  return Math.max(0, Math.min(1, x));
}

/** The pour's three phases from its progress: fly over, pour, fly home. */
function phases(p: number, calm: boolean): { go: number; flow: number; back: number } {
  'worklet';
  if (calm) return { go: 0, flow: ease(clamp01(p)), back: 0 };
  return {
    go: ease(clamp01(p / 0.26)),
    flow: ease(clamp01((p - 0.26) / 0.5)),
    back: ease(clamp01((p - 0.78) / 0.22)),
  };
}

/** Where the flying cup's lip is and how far it is tipped, for pour progress `p`. */
interface Flight {
  readonly px: number;
  readonly py: number;
  readonly sx: number;
  readonly sy: number;
  /** Tip at the pour, radians (sign = direction). */
  readonly angle: number;
  readonly lifted: number;
}

function flightAt(f: Flight, p: number, calm: boolean) {
  'worklet';
  const { go, back } = phases(p, calm);
  if (calm) return { dx: 0, dy: -f.lifted * (1 - p), rot: 0 };
  // Out from the lifted spot to the pour, then home again.
  const k = go * (1 - back);
  return {
    dx: (f.sx - f.px) * k,
    dy: (f.sy - f.py) * k - f.lifted * (1 - go),
    rot: f.angle * k,
  };
}

/**
 * The counter: every cup, drawn with Skia, and the pour between two of
 * them. Cups are static pictures moved by animated transforms; the cups in
 * a pour, the stream, steam and glows are painted each frame. Taps land on
 * plain views over each cup, which also carry the screen-reader labels.
 */
export const Counter = forwardRef<CanvasRef, CounterProps>(function Counter(props, ref) {
  const { pos, layout, look, palette, symbols, calm, selected, hint, anim, shake, burst, served } =
    props;
  const evening = palette.scheme === 'evening';
  // Sparks and hint glows: warm light at night, terracotta by day.
  const spark = evening ? palette.glow : palette.accent;
  const clock = useSharedValue(0);
  useFrameCallback((frame) => {
    clock.set(frame.timeSinceFirstFrame / 1000);
  }, !calm);

  const geos = useMemo(
    () => layout.slots.map((s) => cupGeo(look, s.x, s.base, layout.w, layout.lh, s.cap)),
    [layout, look],
  );

  // ---- pick up and put down
  const lift = useSharedValue(0);
  // The cup last picked up keeps its index while it settles back down.
  const [liftIdx, setLiftIdx] = useState(-1);
  if (selected !== null && selected !== liftIdx) setLiftIdx(selected);
  useEffect(() => {
    if (selected !== null) {
      lift.set(
        calm ? withTiming(1, { duration: 120 }) : withSpring(1, { damping: 13, stiffness: 260 }),
      );
    } else {
      lift.set(
        calm ? withTiming(0, { duration: 120 }) : withSpring(0, { damping: 16, stiffness: 240 }),
      );
    }
  }, [selected, lift, calm]);

  // ---- the pour
  const progress = useSharedValue(1);
  useEffect(() => {
    if (!anim) return;
    lift.set(0);
    progress.set(0);
    progress.set(withTiming(1, { duration: calm ? CALM_POUR_MS : POUR_MS, easing: Easing.linear }));
  }, [anim, calm, progress, lift]);

  const flight = useMemo<Flight | null>(() => {
    if (!anim) return null;
    const s = geos[anim.from];
    const t = geos[anim.to];
    if (!s || !t) return null;
    const lh = layout.lh;
    let dir = t.cx >= s.cx ? 1 : -1;
    const reach = layout.lh * (s.cap + 1.2);
    if (dir === 1 && t.cx - reach < 0) dir = -1;
    else if (dir === -1 && t.cx + reach > layout.width) dir = 1;
    const remaining = anim.source.length - anim.amount;
    const tip = 82 + 26 * (1 - remaining / s.cap);
    return {
      px: s.cx + dir * s.oT,
      py: s.inTop,
      sx: t.cx - dir * t.hT * 0.3,
      sy: t.inTop - lh * 0.45,
      angle: ((dir * tip) / 180) * Math.PI,
      lifted: layout.liftH,
    };
  }, [anim, geos, layout]);

  // ---- a refused pour shakes the cup
  const shakeK = useSharedValue(1);
  useEffect(() => {
    if (!shake) return;
    shakeK.set(0);
    shakeK.set(withTiming(1, { duration: 420 }));
  }, [shake, shakeK]);

  // ---- a finished cup bursts and says "Ready!"
  const burstK = useSharedValue(1);
  const [goneId, setGoneId] = useState(-1);
  const ready = burst && burst.id !== goneId ? burst : null;
  useEffect(() => {
    if (!burst) return;
    burstK.set(0);
    burstK.set(withTiming(1, { duration: calm ? 10 : 1100 }));
    const timer = setTimeout(() => setGoneId(burst.id), 1300);
    return () => clearTimeout(timer);
  }, [burst, burstK, calm]);

  // ---- static scenery: the counter slabs
  const counterPic = useMemo(
    () =>
      createPicture((canvas) => {
        const lh = layout.lh;
        for (const s of layout.shelves) {
          const h = lh * 0.62;
          const p = Skia.Paint();
          p.setAntiAlias(true);
          p.setShader(
            Skia.Shader.MakeLinearGradient(
              { x: 0, y: s.y - lh * 0.1 },
              { x: 0, y: s.y + h },
              [
                Skia.Color(palette.counter[0]),
                Skia.Color(palette.counter[1]),
                Skia.Color(palette.counter[2]),
              ],
              [0, 0.25, 1],
              TileMode.Clamp,
            ),
          );
          canvas.drawRRect(
            Skia.RRectXY(Skia.XYWHRect(s.x0, s.y - lh * 0.1, s.x1 - s.x0, h), lh * 0.18, lh * 0.18),
            p,
          );
          const edge = Skia.Paint();
          edge.setAntiAlias(true);
          edge.setColor(
            Skia.Color(evening ? 'rgba(255, 210, 160, 0.28)' : 'rgba(255, 240, 220, 0.6)'),
          );
          canvas.drawRect(
            Skia.XYWHRect(
              s.x0 + lh * 0.2,
              s.y - lh * 0.1,
              s.x1 - s.x0 - lh * 0.4,
              Math.max(1, lh * 0.05),
            ),
            edge,
          );
          if (!evening) {
            // Terracotta tiles along the counter face.
            const line = Skia.Paint();
            line.setAntiAlias(true);
            line.setColor(Skia.Color('rgba(120, 50, 20, 0.25)'));
            line.setStrokeWidth(1);
            for (let x = s.x0 + lh * 1.1; x < s.x1 - lh * 0.5; x += lh * 1.4) {
              canvas.drawLine(x, s.y + lh * 0.08, x, s.y + h - lh * 0.12, line);
            }
          }
        }
      }),
    [layout, palette, evening],
  );

  // ---- glows under cups: picked up, or pointed out by a hint
  const under = useDerivedValue(() => {
    const t = clock.get();
    const up = lift.get();
    return createPicture((canvas) => {
      if (liftIdx >= 0 && up > 0.01 && (!anim || anim.from !== liftIdx)) {
        const g = geos[liftIdx];
        if (g) {
          canvas.save();
          canvas.translate(0, -layout.liftH * up);
          drawGlow(canvas, g, palette.accent, 0.42 * up);
          canvas.restore();
        }
      }
      if (hint) {
        const pulse = calm ? 0.45 : 0.3 + 0.25 * Math.sin(t * 4);
        const g = geos[hint.to];
        if (g) drawGlow(canvas, g, spark, pulse);
      }
    });
  });

  // ---- the stream, hint arrow and bursts, over everything
  const fx = useDerivedValue(() => {
    const t = clock.get();
    const p = progress.get();
    const b = burstK.get();
    return createPicture((canvas) => {
      if (anim && flight && !calm && p < 1) {
        const { flow } = phases(p, false);
        const tg = geos[anim.to];
        const ink = INKS[anim.ing];
        if (tg && ink && flow > 0 && flow < 1) {
          const below = anim.target.length - anim.amount;
          const surface = tg.inBottom - (below + anim.amount * flow) * tg.lh - tg.lh * 0.05;
          const head = Math.min(1, flow / 0.12);
          const tail = Math.max(0, (flow - 0.86) / 0.14);
          const x0 = flight.sx;
          const y0 = flight.sy;
          const x1 = flight.sx + Math.sign(flight.angle) * tg.lh * 0.18;
          drawStream(
            canvas,
            x0 + (x1 - x0) * tail,
            y0 + (surface - y0) * tail,
            x1,
            y0 + (surface - y0) * head,
            tg.lh * 0.2 * (1 - 0.4 * tail),
            ink,
          );
        }
      }
      if (hint && !anim) {
        const g = geos[hint.to];
        if (g) {
          const bob = calm ? 0 : Math.sin(t * 5) * g.lh * 0.18;
          drawArrow(canvas, g.cx, g.inTop - g.lh * 1.1 + bob, g.lh * 0.5, palette.accent);
        }
      }
      if (burst && b < 1) {
        const g = geos[burst.cup];
        if (g) drawBurst(canvas, g, b, spark);
      }
    });
  });

  // Draw order: the flying cup last, so it passes over the others.
  const order = useMemo(() => {
    const ids = geos.map((_, i) => i);
    if (anim) {
      const k = ids.indexOf(anim.from);
      ids.splice(k, 1);
      ids.push(anim.from);
    }
    return ids;
  }, [geos, anim]);

  return (
    <View style={{ width: layout.width, height: layout.height }}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={props.onTapCounter}
        accessible={false}
        importantForAccessibility="no"
      />
      <Canvas ref={ref} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Picture picture={counterPic} />
        <Picture picture={under} />
        {order.map((i) => {
          const g = geos[i];
          if (!g) return null;
          const inPour = anim && (anim.from === i || anim.to === i);
          return (
            <CupNode
              key={i}
              index={i}
              g={g}
              look={look}
              evening={evening}
              layers={pos.cups[i] ?? []}
              lid={pos.lids[i] ?? 0}
              served={!!served[i]}
              symbols={symbols}
              calm={calm}
              steam={palette.steam}
              clock={clock}
              lift={i === liftIdx ? lift : null}
              liftH={layout.liftH}
              shake={shake?.cup === i ? shakeK : null}
              progress={progress}
              moving={
                inPour && anim
                  ? anim.from === i
                    ? {
                        out: true,
                        ing: anim.ing,
                        amount: anim.amount,
                        base: anim.source.slice(0, anim.source.length - anim.amount),
                      }
                    : {
                        out: false,
                        ing: anim.ing,
                        amount: anim.amount,
                        base: anim.target.slice(0, anim.target.length - anim.amount),
                      }
                  : null
              }
              flight={anim?.from === i ? flight : null}
            />
          );
        })}
        <Picture picture={fx} />
      </Canvas>
      {geos.map((g, i) =>
        (pos.lids[i] ?? 0) > 0 ? (
          <View
            key={`lid${i}`}
            pointerEvents="none"
            style={[
              styles.badge,
              {
                left: g.cx - 13,
                top: g.inTop - layout.lh * 0.62 - 13,
                backgroundColor: palette.surface,
                borderColor: '#b8862e',
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: palette.text }]} allowFontScaling={false}>
              {pos.lids[i]}
            </Text>
          </View>
        ) : null,
      )}
      {ready && geos[ready.cup] ? (
        <Animated.View
          key={ready.id}
          entering={calm ? undefined : ZoomIn.springify().damping(12)}
          pointerEvents="none"
          style={[
            styles.ready,
            {
              left: geos[ready.cup]!.cx - 50,
              top: geos[ready.cup]!.inTop - layout.lh * 2.2,
              backgroundColor: palette.accent,
            },
          ]}
        >
          <Text style={[styles.readyText, { color: palette.onAccent }]} allowFontScaling={false}>
            {props.readyText}
          </Text>
        </Animated.View>
      ) : null}
      {geos.map((g, i) => {
        const top = g.inTop - layout.liftH - layout.lh * 0.4;
        return (
          <Pressable
            key={`tap${i}`}
            onPress={() => props.onTapCup(i)}
            accessibilityRole="button"
            accessibilityLabel={props.label(i)}
            accessibilityState={{ selected: selected === i }}
            style={[
              styles.tap,
              {
                left: g.cx - layout.slotW / 2,
                top,
                width: layout.slotW,
                height: g.by - top + layout.lh * 0.3,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

interface CupNodeProps {
  readonly index: number;
  readonly g: Geo;
  readonly look: CupLook;
  readonly evening: boolean;
  readonly layers: readonly number[];
  readonly lid: number;
  readonly served: boolean;
  readonly symbols: boolean;
  readonly calm: boolean;
  readonly steam: string;
  readonly clock: SharedValue<number>;
  readonly lift: SharedValue<number> | null;
  readonly liftH: number;
  readonly shake: SharedValue<number> | null;
  readonly progress: SharedValue<number>;
  readonly moving: {
    readonly out: boolean;
    readonly ing: number;
    readonly amount: number;
    readonly base: readonly number[];
  } | null;
  readonly flight: Flight | null;
}

const EMPTY: SkPicture = createPicture(() => undefined);

/** One cup: back and liquid, then its front, moved by lift, shake and flight. */
function CupNode(p: CupNodeProps) {
  const { g, look, evening, layers, lid, served, symbols, calm, moving, flight, index } = p;
  const back = useMemo(
    () =>
      createPicture((canvas) => {
        drawCupBack(canvas, g, look, evening);
        if (!moving) drawLiquid(canvas, g, layers, INKS, symbols);
      }),
    [g, look, evening, layers, symbols, moving],
  );
  const front = useMemo(
    () =>
      createPicture((canvas) => {
        drawCupFront(canvas, g, look, index, evening);
        if (lid > 0) drawLid(canvas, g);
      }),
    [g, look, index, lid, evening],
  );
  const { progress, clock, lift, shake, liftH, steam } = p;
  const liquid = useDerivedValue(() => {
    if (!moving) return EMPTY;
    const k = progress.get();
    const { flow, back: home } = phases(k, calm);
    const amount = moving.out ? moving.amount * (1 - flow) : moving.amount * flow;
    const wobble = moving.out
      ? 0
      : calm
        ? 0
        : 7 * Math.sin(k * 34) * (1 - home) * Math.min(1, flow * 3);
    return createPicture((canvas) => {
      drawLiquid(canvas, g, moving.base, INKS, symbols, moving.ing, amount, wobble);
    });
  });
  const steamPic = useDerivedValue(() => {
    if (!served) return EMPTY;
    const t = clock.get();
    return createPicture((canvas) => drawSteam(canvas, g, t, steam, calm));
  });
  const transform = useDerivedValue(() => {
    let dx = 0;
    let dy = 0;
    let rot = 0;
    if (lift) dy -= liftH * lift.get();
    if (shake) {
      const k = shake.get();
      dx += Math.sin(k * Math.PI * 6) * (1 - k) * g.w * 0.1;
    }
    if (flight) {
      const k = progress.get();
      if (k < 1) {
        const f = flightAt(flight, k, calm);
        dx += f.dx;
        dy += f.dy;
        rot = f.rot;
      }
    }
    const px = flight ? flight.px : g.cx;
    const py = flight ? flight.py : g.inTop;
    return [
      { translateX: px + dx },
      { translateY: py + dy },
      { rotate: rot },
      { translateX: -px },
      { translateY: -py },
    ];
  });
  return (
    <Group transform={transform}>
      <Picture picture={back} />
      {moving ? <Picture picture={liquid} /> : null}
      <Picture picture={front} />
      {served ? <Picture picture={steamPic} /> : null}
    </Group>
  );
}

const styles = StyleSheet.create({
  tap: { position: 'absolute' },
  badge: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: FONTS.bodyHeavy, fontSize: 13 },
  ready: {
    position: 'absolute',
    width: 100,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
  },
  readyText: { fontFamily: FONTS.displayBold, fontSize: 15 },
});
