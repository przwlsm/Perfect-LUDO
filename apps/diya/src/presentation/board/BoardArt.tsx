import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BlendMode,
  BlurMask,
  Circle,
  createPicture,
  DashPathEffect,
  Group,
  Path,
  Picture,
  RadialGradient,
  Skia,
  vec,
  type SkPicture,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { mix, random, withAlpha } from 'app-kit';
import { WHITE, type Piece } from '@/domain/entities/Board';
import { lightColour, type BoardLook, type LampStyle } from '../theme/festivals';
import { drawPiece, drawSymbols, lampAnchor, type PieceMode } from './paint';

/** A teardrop flame path, swaying with the clock. Runs on the UI thread. */
function flamePath(x: number, y: number, h: number, w: number, sway: number) {
  'worklet';
  return Skia.PathBuilder.Make()
    .moveTo(x, y + w * 0.35)
    .cubicTo(x - w * 1.15, y, x - w * 0.8, y - h * 0.5, x + sway * h, y - h)
    .cubicTo(x + w * 0.8, y - h * 0.5, x + w * 1.15, y, x, y + w * 0.35)
    .close()
    .build();
}

// ---------------------------------------------------------------- beams

interface BeamsProps {
  /** Flat segments from the trace: x1, y1, x2, y2, hue, time (cell units). */
  readonly segs: readonly number[];
  readonly bx: number;
  readonly by: number;
  readonly c: number;
  readonly look: BoardLook;
  readonly clock: SharedValue<number>;
  readonly calm: boolean;
  readonly colourAid: boolean;
}

function keysOf(segs: readonly number[]): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < segs.length; i += 6) {
    keys.add(`${segs[i]},${segs[i + 1]},${segs[i + 2]},${segs[i + 3]},${segs[i + 4]}`);
  }
  return keys;
}

interface BeamGroup {
  readonly hue: number;
  readonly colour: string;
  readonly stable: ReturnType<typeof Skia.Path.Make> | null;
  readonly fresh: ReturnType<typeof Skia.Path.Make> | null;
}

/**
 * Light as layered strokes added together: a wide soft glow, a bright body,
 * a white-hot core, and sparks flowing outward along it. Segments that just
 * appeared are drawn in the order light reached them, so new light visibly
 * travels from the change outward.
 */
export function Beams({ segs, bx, by, c, look, clock, calm, colourAid }: BeamsProps) {
  // The segments drawn last time, kept as state so new light can be told apart from old.
  const [seen, setSeen] = useState<{ segs: readonly number[]; previous: ReadonlySet<string> }>(
    () => ({
      segs,
      previous: new Set(),
    }),
  );
  if (seen.segs !== segs) setSeen({ segs, previous: keysOf(seen.segs) });
  const previous = seen.segs === segs ? seen.previous : keysOf(seen.segs);
  const reveal = useSharedValue(1);
  const { groups, keys, freshCount } = useMemo(() => {
    const builders = new Map<
      number,
      {
        stable: ReturnType<typeof Skia.PathBuilder.Make>;
        fresh: ReturnType<typeof Skia.PathBuilder.Make>;
        s: number;
        f: number;
      }
    >();
    const keys = new Set<string>();
    let freshCount = 0;
    for (let i = 0; i < segs.length; i += 6) {
      const [x1, y1, x2, y2, hue] = [
        segs[i]!,
        segs[i + 1]!,
        segs[i + 2]!,
        segs[i + 3]!,
        segs[i + 4]!,
      ];
      const key = `${x1},${y1},${x2},${y2},${hue}`;
      keys.add(key);
      let b = builders.get(hue);
      if (!b) {
        b = { stable: Skia.PathBuilder.Make(), fresh: Skia.PathBuilder.Make(), s: 0, f: 0 };
        builders.set(hue, b);
      }
      const isFresh = !previous.has(key);
      const target = isFresh ? b.fresh : b.stable;
      target.moveTo(bx + x1 * c, by + y1 * c).lineTo(bx + x2 * c, by + y2 * c);
      if (isFresh) {
        b.f++;
        freshCount++;
      } else b.s++;
    }
    const groups: BeamGroup[] = [...builders.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hue, b]) => ({
        hue,
        colour: lightColour(hue, look),
        stable: b.s ? b.stable.build() : null,
        fresh: b.f ? b.fresh.build() : null,
      }));
    return { groups, keys, freshCount };
  }, [segs, bx, by, c, look, previous]);

  useEffect(() => {
    if (freshCount === 0 || calm) {
      reveal.set(1);
      return;
    }
    reveal.set(0);
    reveal.set(
      withTiming(1, {
        duration: Math.min(900, 120 + freshCount * 55),
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [keys, freshCount, calm, reveal]);

  const phase = useDerivedValue(() => -clock.get() * c * 1.6);
  const shimmer = useDerivedValue(() => 0.82 + 0.18 * Math.sin(clock.get() * 2.6));

  const symbols = useMemo(() => {
    if (!colourAid) return null;
    return createPicture((canvas) => {
      for (let i = 0; i < segs.length; i += 6) {
        const hue = segs[i + 4]!;
        if (hue === WHITE) continue;
        const [x1, y1, x2, y2] = [segs[i]!, segs[i + 1]!, segs[i + 2]!, segs[i + 3]!];
        if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 0.99) continue;
        drawSymbols(canvas, hue, bx + ((x1 + x2) / 2) * c, by + ((y1 + y2) / 2) * c, c * 0.15);
      }
    });
  }, [colourAid, segs, bx, by, c]);

  return (
    <>
      <Group blendMode="plus">
        {groups.map((g) => (
          <Group key={g.hue}>
            {g.stable && (
              <BeamLayers
                path={g.stable}
                colour={g.colour}
                c={c}
                phase={phase}
                shimmer={shimmer}
                calm={calm}
              />
            )}
            {g.fresh && (
              <BeamLayers
                path={g.fresh}
                colour={g.colour}
                c={c}
                phase={phase}
                shimmer={shimmer}
                calm={calm}
                end={reveal}
              />
            )}
          </Group>
        ))}
      </Group>
      {symbols && <Picture picture={symbols} />}
    </>
  );
}

function BeamLayers({
  path,
  colour,
  c,
  phase,
  shimmer,
  calm,
  end,
}: {
  path: ReturnType<typeof Skia.Path.Make>;
  colour: string;
  c: number;
  phase: SharedValue<number>;
  shimmer: SharedValue<number>;
  calm: boolean;
  end?: SharedValue<number>;
}) {
  const core = mix(colour, '#ffffff', 0.75);
  return (
    <>
      <Path
        path={path}
        style="stroke"
        strokeWidth={c * 0.46}
        strokeCap="round"
        color={colour}
        opacity={0.3}
        end={end}
      >
        <BlurMask blur={c * 0.2} style="normal" />
      </Path>
      <Path
        path={path}
        style="stroke"
        strokeWidth={c * 0.17}
        strokeCap="round"
        color={colour}
        opacity={shimmer}
        end={end}
      >
        <BlurMask blur={c * 0.05} style="normal" />
      </Path>
      <Path
        path={path}
        style="stroke"
        strokeWidth={Math.max(1.5, c * 0.05)}
        strokeCap="round"
        color={core}
        end={end}
      />
      {!calm && (
        <Path
          path={path}
          style="stroke"
          strokeWidth={c * 0.09}
          strokeCap="round"
          color="#ffffff"
          opacity={0.75}
          end={end}
        >
          <DashPathEffect intervals={[c * 0.05, c * 0.95]} phase={phase} />
          <BlurMask blur={c * 0.03} style="normal" />
        </Path>
      )}
    </>
  );
}

// ---------------------------------------------------------------- pieces

interface SpriteProps {
  readonly piece: Piece;
  readonly mode: PieceMode;
  readonly x: number;
  readonly y: number;
  readonly c: number;
  readonly look: BoardLook;
  readonly colourAid: boolean;
  /** Springs in from a little larger: the click into the grid. */
  readonly appear?: boolean;
  readonly opacity?: number;
}

export function piecePicture(
  piece: Piece,
  c: number,
  look: BoardLook,
  mode: PieceMode,
  colourAid: boolean,
): SkPicture {
  const upright: Piece = piece.type === 'mirror' ? { type: 'mirror', slant: 0 } : piece;
  return createPicture(
    (canvas) => drawPiece(canvas, upright, c, look, mode, colourAid),
    Skia.XYWHRect(-c, -c, c * 2, c * 2),
  );
}

/** A piece on the board. Mirrors turn a quarter at a time with a spring; new pieces settle in. */
export function PieceSprite({
  piece,
  mode,
  x,
  y,
  c,
  look,
  colourAid,
  appear,
  opacity = 1,
}: SpriteProps) {
  const picture = useMemo(
    () => piecePicture(piece, c, look, mode, colourAid),
    [piece, c, look, mode, colourAid],
  );
  const slant = piece.type === 'mirror' ? piece.slant : 0;
  const turns = useRef(slant);
  const lastSlant = useRef(slant);
  const angle = useSharedValue(slant * 90);
  const scale = useSharedValue(appear ? 1.35 : 1);
  useEffect(() => {
    if (appear) scale.set(withSpring(1, { damping: 11, stiffness: 260 }));
  }, [appear, scale]);
  useEffect(() => {
    if (slant === lastSlant.current) return;
    lastSlant.current = slant;
    turns.current += 1;
    angle.set(withSpring(turns.current * 90, { damping: 14, stiffness: 240 }));
  }, [slant, angle]);
  const transform = useDerivedValue(() => [
    { translateX: x },
    { translateY: y },
    { rotate: (angle.get() * Math.PI) / 180 },
    { scale: scale.get() },
  ]);
  return (
    <Group transform={transform} opacity={opacity}>
      <Picture picture={picture} />
    </Group>
  );
}

// ---------------------------------------------------------------- lamps

interface LampLightProps {
  readonly x: number;
  readonly y: number;
  readonly c: number;
  readonly style: LampStyle;
  /** The colour this lamp wants. */
  readonly want: string;
  /** The colour of the light reaching it now (for a wrong-colour sputter). */
  readonly got: string;
  readonly state: 'lit' | 'dark' | 'wrong';
  readonly sleeper: boolean;
  readonly clock: SharedValue<number>;
  /** Seconds since the win, -1 before. */
  readonly win: SharedValue<number>;
  readonly order: number;
  readonly calm: boolean;
  /** A white lamp burns a warm gold flame rather than its pale light colour. */
  readonly warm?: boolean;
}

/** A lamp's own light: an ember when dark, a full flame and halo when lit, a sputter when wrong. */
export function LampLight({
  x,
  y,
  c,
  style,
  want,
  got,
  state,
  sleeper,
  clock,
  win,
  order,
  calm,
  warm,
}: LampLightProps) {
  const glow = useSharedValue(state === 'lit' ? 1 : 0);
  const wrong = useSharedValue(state === 'wrong' ? 1 : 0);
  useEffect(() => {
    glow.set(withSpring(state === 'lit' ? 1 : 0, { damping: 13, stiffness: 110 }));
    wrong.set(withTiming(state === 'wrong' ? 1 : 0, { duration: 220 }));
  }, [state, glow, wrong]);
  const anchor = lampAnchor(style, c);
  const ax = x + anchor.x;
  const ay = y + anchor.y;
  const seed = (x * 13.7 + y * 7.3) % 6.28;

  const flare = useDerivedValue(() => {
    const t = win.get();
    if (t < 0) return 0;
    const d = t - (0.1 + order * 0.16);
    return d < 0 ? 0 : Math.max(0.35, 1 - Math.abs(d - 0.25) / 0.6);
  });
  const haloR = useDerivedValue(() => c * (0.5 + 0.6 * glow.get() + 0.7 * flare.get()));
  const haloOpacity = useDerivedValue(() => {
    const flick = calm ? 1 : 0.8 + 0.2 * Math.sin(clock.get() * 7 + seed);
    return Math.min(1, (0.1 + 0.75 * glow.get() + 0.35 * wrong.get()) * flick + 0.3 * flare.get());
  });
  const flame = useDerivedValue(() => {
    const t = clock.get();
    const g = glow.get();
    const wr = wrong.get();
    const flicker = calm
      ? 1
      : 1 + Math.sin(t * 11 + seed) * 0.05 + Math.sin(t * 23 + seed * 2) * (0.03 + 0.12 * wr);
    const sway = calm ? 0 : Math.sin(t * 2.4 + seed) * 0.06;
    const h = c * (0.07 + 0.33 * g + 0.13 * wr + 0.12 * flare.get()) * flicker;
    const w = c * (0.05 + 0.05 * g + 0.02 * wr);
    return flamePath(ax, ay, h, w, sway);
  });
  const core = useDerivedValue(() => {
    const t = clock.get();
    const g = glow.get();
    const h = c * (0.03 + 0.17 * g) * (calm ? 1 : 1 + Math.sin(t * 13 + seed) * 0.05);
    return flamePath(ax, ay, h, c * (0.025 + 0.03 * g), 0);
  });
  const emberOpacity = useDerivedValue(
    () =>
      (1 - glow.get()) *
      (1 - wrong.get()) *
      (calm ? 0.6 : 0.4 + 0.3 * Math.sin(clock.get() * 3 + seed)),
  );
  const flameColour = state === 'wrong' ? got : want;
  const innerR = useDerivedValue(() => c * (0.06 + 0.2 * glow.get() + 0.1 * flare.get()));

  if (sleeper) {
    return <SleeperAlarm x={x} y={y} c={c} awake={state === 'wrong'} clock={clock} calm={calm} />;
  }
  return (
    <Group>
      <Circle cx={ax} cy={ay} r={haloR} opacity={haloOpacity} blendMode="plus">
        <RadialGradient
          c={vec(ax, ay)}
          r={c * 1.25}
          colors={[withAlpha(flameColour, 0.95), withAlpha(flameColour, 0)]}
        />
      </Circle>
      {anchor.glow ? (
        <Circle
          cx={ax}
          cy={ay}
          r={innerR}
          color={mix(flameColour, '#ffffff', 0.55)}
          blendMode="plus"
        >
          <BlurMask blur={c * 0.08} style="normal" />
        </Circle>
      ) : (
        <>
          <Circle cx={ax} cy={ay} r={c * 0.035} color="#ff8a3d" opacity={emberOpacity}>
            <BlurMask blur={2} style="solid" />
          </Circle>
          <Path
            path={flame}
            color={warm && state !== 'wrong' ? mix(flameColour, '#ff9a2e', 0.55) : flameColour}
            blendMode="plus"
          >
            <BlurMask blur={c * 0.06} style="solid" />
          </Path>
          <Path path={core} color="#fffbea" opacity={0.95} />
        </>
      )}
    </Group>
  );
}

function SleeperAlarm({
  x,
  y,
  c,
  awake,
  clock,
  calm,
}: {
  x: number;
  y: number;
  c: number;
  awake: boolean;
  clock: SharedValue<number>;
  calm: boolean;
}) {
  const on = useSharedValue(awake ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(awake ? 1 : 0, { duration: 200 }));
  }, [awake, on]);
  const opacity = useDerivedValue(
    () => on.get() * (calm ? 0.8 : 0.55 + 0.45 * Math.sin(clock.get() * 8)),
  );
  return (
    <Group>
      <Circle
        cx={x}
        cy={y}
        r={c * 0.46}
        style="stroke"
        strokeWidth={c * 0.06}
        color="#ff5a6e"
        opacity={opacity}
      >
        <BlurMask blur={c * 0.04} style="solid" />
      </Circle>
      <Circle cx={x} cy={y} r={c * 0.7} opacity={opacity} blendMode="plus">
        <RadialGradient
          c={vec(x, y)}
          r={c * 0.7}
          colors={['rgba(255,90,110,0.55)', 'rgba(255,90,110,0)']}
        />
      </Circle>
    </Group>
  );
}

/** The flame that feeds a beam: always burning, with a soft halo. */
export function SourceFlame({
  x,
  y,
  c,
  colour,
  clock,
  calm,
}: {
  x: number;
  y: number;
  c: number;
  colour: string;
  clock: SharedValue<number>;
  calm: boolean;
}) {
  const seed = (x * 3.1 + y * 5.7) % 6.28;
  const flame = useDerivedValue(() => {
    const t = clock.get();
    const flicker = calm ? 1 : 1 + Math.sin(t * 9 + seed) * 0.06 + Math.sin(t * 17 + seed) * 0.04;
    const sway = calm ? 0 : Math.sin(t * 2.1 + seed) * 0.07;
    return flamePath(x, y + c * 0.16, c * 0.42 * flicker, c * 0.1, sway);
  });
  const core = useDerivedValue(() => {
    const t = clock.get();
    return flamePath(
      x,
      y + c * 0.14,
      c * 0.2 * (calm ? 1 : 1 + Math.sin(t * 13 + seed) * 0.06),
      c * 0.05,
      0,
    );
  });
  const halo = useDerivedValue(() =>
    calm ? 0.75 : 0.65 + 0.15 * Math.sin(clock.get() * 5 + seed),
  );
  return (
    <Group>
      <Circle cx={x} cy={y} r={c * 0.8} opacity={halo} blendMode="plus">
        <RadialGradient
          c={vec(x, y)}
          r={c * 0.8}
          colors={[withAlpha(colour, 0.7), withAlpha(colour, 0)]}
        />
      </Circle>
      <Path path={flame} color={mix(colour, '#ff9a3c', 0.35)} blendMode="plus">
        <BlurMask blur={c * 0.05} style="solid" />
      </Path>
      <Path path={core} color="#fffdf2" />
    </Group>
  );
}

// ---------------------------------------------------------------- the win

interface WinFxProps {
  readonly win: SharedValue<number>;
  readonly lamps: readonly { x: number; y: number; colour: string }[];
  readonly box: { x: number; y: number; w: number; h: number };
  readonly c: number;
  readonly sparks: readonly string[];
  readonly calm: boolean;
}

/**
 * The finale: a gold wash over the board, sparks rising from every lamp,
 * then a few soft fireworks. Calmer motion keeps only the wash.
 */
export function WinFx({ win, lamps, box, c, sparks, calm }: WinFxProps) {
  const particles = useMemo(() => {
    // Deterministic per-board randomness, flattened for the UI thread.
    const r = random(12345);
    const rise: number[] = [];
    lamps.forEach((l, i) => {
      for (let k = 0; k < 16; k++) rise.push(l.x, l.y, r(), r(), r(), 0.15 + i * 0.16 + k * 0.05);
    });
    const bursts: number[] = [];
    const count = Math.min(5, 3 + Math.floor(lamps.length / 2));
    for (let b = 0; b < count; b++) {
      bursts.push(
        box.x + box.w * (0.2 + 0.6 * r()),
        box.y + box.h * (0.15 + 0.35 * r()),
        0.9 + b * 0.38,
        b % sparks.length,
      );
    }
    const seeds = Array.from({ length: 32 }, () => r());
    return { rise, bursts, seeds, lampColours: lamps.map((l) => l.colour) };
  }, [lamps, box, sparks]);

  const picture = useDerivedValue(() => {
    const t = win.get();
    return createPicture((canvas) => {
      if (t < 0) return;
      const p = Skia.Paint();
      p.setAntiAlias(true);
      p.setBlendMode(BlendMode.Plus);
      // Gold wash.
      const wash = Math.min(1, t / 0.7) * (calm ? 0.34 : 0.3 + 0.08 * Math.sin(t * 2));
      p.setShader(
        Skia.Shader.MakeRadialGradient(
          { x: box.x + box.w / 2, y: box.y + box.h / 2 },
          Math.max(box.w, box.h) * 0.75,
          [Skia.Color('rgba(255, 196, 90, 0.9)'), Skia.Color('rgba(255, 150, 60, 0)')],
          null,
          0,
        ),
      );
      p.setAlphaf(wash);
      canvas.drawRect(Skia.XYWHRect(box.x, box.y, box.w, box.h), p);
      p.setShader(null);
      if (calm) return;
      const { rise, bursts, seeds, lampColours } = particles;
      for (let i = 0; i < rise.length; i += 6) {
        const age = t - rise[i + 5]!;
        const life = 1.8 + rise[i + 4]! * 0.8;
        if (age < 0 || age > life) continue;
        const k = age / life;
        const x =
          rise[i]! +
          (rise[i + 2]! - 0.5) * c * 0.5 +
          Math.sin(age * 3 + rise[i + 3]! * 6) * c * 0.12;
        const y = rise[i + 1]! - age * c * (0.9 + rise[i + 3]! * 0.9);
        p.setColor(Skia.Color(lampColours[Math.floor(i / 6 / 16)] ?? '#ffd27a'));
        p.setAlphaf((1 - k) * 0.95);
        canvas.drawCircle(x, y, c * (0.025 + 0.025 * rise[i + 4]!) * (1 - k * 0.5), p);
      }
      for (let b = 0; b < bursts.length; b += 4) {
        const age = t - bursts[b + 2]!;
        if (age < 0 || age > 1.7) continue;
        const k = age / 1.7;
        const ease = 1 - (1 - Math.min(1, age / 0.9)) ** 3;
        if (age < 0.18) {
          // The bloom of the burst itself.
          p.setColor(Skia.Color('#fff4d6'));
          p.setAlphaf(1 - age / 0.18);
          canvas.drawCircle(bursts[b]!, bursts[b + 1]!, c * (0.15 + age * 1.5), p);
        }
        p.setColor(Skia.Color(sparks[bursts[b + 3]!] ?? '#ffd27a'));
        p.setAlphaf((1 - k) ** 1.4);
        for (let s = 0; s < seeds.length; s++) {
          const a = (s / seeds.length) * Math.PI * 2;
          const speed = c * 2.1 * (0.6 + 0.4 * seeds[s]!);
          const x = bursts[b]! + Math.cos(a) * speed * ease;
          const y = bursts[b + 1]! + Math.sin(a) * speed * ease + age * age * c * 0.7;
          canvas.drawCircle(x, y, c * 0.055 * (1 - k * 0.6), p);
          canvas.drawCircle(
            x - Math.cos(a) * c * 0.12 * (1 - ease),
            y - Math.sin(a) * c * 0.12 * (1 - ease),
            c * 0.03 * (1 - k),
            p,
          );
        }
      }
    });
  });
  return <Picture picture={picture} />;
}
