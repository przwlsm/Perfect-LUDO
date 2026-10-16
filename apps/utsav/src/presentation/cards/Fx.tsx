import { useMemo } from 'react';
import { Circle, Group, Path, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { random, withAlpha } from 'app-kit';
import type { CardPalette, FxKind } from '@/domain/entities/Template';
import type { Point } from './paint/kit';

const STAR = (() => {
  const b = Skia.PathBuilder.Make();
  const s = 0.18;
  b.moveTo(0, -1);
  b.quadTo(s, -s, 1, 0);
  b.quadTo(s, s, 0, 1);
  b.quadTo(-s, s, -1, 0);
  b.quadTo(-s, -s, 0, -1);
  b.close();
  return b.build();
})();

const PETAL = (() => {
  const b = Skia.PathBuilder.Make();
  b.moveTo(0, -1);
  b.cubicTo(0.7, -0.6, 0.6, 0.6, 0, 1);
  b.cubicTo(-0.6, 0.6, -0.7, -0.6, 0, -1);
  b.close();
  return b.build();
})();

interface Particle {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly phase: number;
  readonly speed: number;
  readonly color: string;
}

interface FxProps {
  readonly kind: FxKind;
  /** Points from the design to twinkle, in card units. */
  readonly anchors: readonly Point[];
  /** Flames and lamps from the design, which flicker whatever the kind. */
  readonly lights?: readonly Point[];
  readonly W: number;
  readonly H: number;
  readonly palette: CardPalette;
  /** Seconds since the preview started. */
  readonly clock: SharedValue<number>;
}

/**
 * The gentle live layer over the editor preview, in card units: sparkles
 * twinkle, flames flicker, snow and petals drift. Exports never include it.
 */
export function FxLayer({ kind, anchors, lights = [], W, H, palette, clock }: FxProps) {
  const parts = useMemo(() => {
    const rnd = random(anchors.length * 7919 + Math.round(W + H));
    const colors = [palette.gold, palette.accent, palette.accent2, palette.accent3];
    // Sizes are in card units; a smaller canvas (a whole screen in dp) shrinks them.
    const unit = Math.max(0.45, Math.min(1, W / 1080));
    const make = (p: Point, size: number, color: string): Particle => ({
      x: p.x,
      y: p.y,
      size: size * unit,
      phase: rnd() * Math.PI * 2,
      speed: 0.6 + rnd() * 1.2,
      color,
    });
    const spread = (n: number) => Array.from({ length: n }, () => ({ x: rnd() * W, y: rnd() * H }));
    switch (kind) {
      case 'fireworks':
        return anchors
          .slice(0, 6)
          .map((p, i) => make(p, 120 + rnd() * 60, colors[i % colors.length]!));
      case 'snow':
        return spread(H > W ? 54 : 36).map((p) => make(p, 3 + rnd() * 5, '#ffffff'));
      case 'confetti':
        return spread(H > W ? 34 : 24).map((p) =>
          make(p, 10 + rnd() * 8, colors[Math.floor(rnd() * 4)]!),
        );
      case 'petals':
        return spread(H > W ? 22 : 15).map((p) =>
          make(p, 12 + rnd() * 10, colors[1 + Math.floor(rnd() * 3)]!),
        );
      case 'bokeh':
        return spread(14).map((p) =>
          make(p, 24 + rnd() * 50, rnd() < 0.5 ? palette.gold : palette.glow),
        );
      default: {
        const pts = anchors.length >= 6 ? anchors.slice(0, 18) : [...anchors, ...spread(10)];
        return pts.map((p) => make(p, 12 + rnd() * 10, palette.dark ? '#fff6dc' : palette.gold));
      }
    }
  }, [kind, anchors, W, H, palette]);
  const flames = useMemo(() => {
    const rnd = random(lights.length * 104729 + 7);
    return lights.slice(0, 12).map((p) => ({
      x: p.x,
      y: p.y,
      size: 34 + rnd() * 18,
      phase: rnd() * Math.PI * 2,
      speed: 1,
      color: palette.glow,
    }));
  }, [lights, palette]);

  return (
    <Group>
      {flames.map((p, i) => (
        <Flicker key={`f${i}`} p={p} clock={clock} />
      ))}
      {parts.map((p, i) => {
        switch (kind) {
          case 'fireworks':
            return <Burst key={i} p={p} clock={clock} index={i} />;
          case 'snow':
          case 'confetti':
          case 'petals':
            return <Fall key={i} p={p} clock={clock} H={H} kind={kind} />;
          case 'bokeh':
            return <Drift key={i} p={p} clock={clock} H={H} />;
          default:
            return <Twinkle key={i} p={p} clock={clock} />;
        }
      })}
    </Group>
  );
}

interface PartProps {
  readonly p: Particle;
  readonly clock: SharedValue<number>;
}

function Twinkle({ p, clock }: PartProps) {
  const opacity = useDerivedValue(() => {
    const v = 0.5 + 0.5 * Math.sin(clock.get() * p.speed * 2 + p.phase);
    return v * v;
  });
  const transform = useDerivedValue(() => {
    const v = 0.5 + 0.5 * Math.sin(clock.get() * p.speed * 2 + p.phase);
    return [{ translateX: p.x }, { translateY: p.y }, { scale: p.size * (0.6 + 0.5 * v) }];
  });
  return (
    <Group opacity={opacity} transform={transform}>
      <Circle cx={0} cy={0} r={1.6}>
        <RadialGradient
          c={vec(0, 0)}
          r={1.6}
          colors={[withAlpha(p.color, 0.45), withAlpha(p.color, 0)]}
        />
      </Circle>
      <Path path={STAR} color={p.color} />
    </Group>
  );
}

function Flicker({ p, clock }: PartProps) {
  const r = useDerivedValue(() => {
    const t = clock.get();
    return (
      p.size * (1 + 0.07 * Math.sin(t * 9 + p.phase) + 0.05 * Math.sin(t * 13.7 + p.phase * 2))
    );
  });
  const opacity = useDerivedValue(() => 0.55 + 0.25 * Math.sin(clock.get() * 7.3 + p.phase));
  return (
    <Circle cx={p.x} cy={p.y} r={r} opacity={opacity}>
      <RadialGradient
        c={vec(p.x, p.y)}
        r={p.size * 1.15}
        colors={[withAlpha('#fff3c4', 0.75), withAlpha(p.color, 0.4), withAlpha(p.color, 0)]}
        positions={[0, 0.35, 1]}
      />
    </Circle>
  );
}

function Burst({ p, clock, index }: PartProps & { index: number }) {
  const period = 2.6;
  const transform = useDerivedValue(() => {
    const t = ((clock.get() + index * 0.9) % period) / period;
    return [{ translateX: p.x }, { translateY: p.y }, { scale: 0.15 + t * 1.1 }];
  });
  const opacity = useDerivedValue(() => {
    const t = ((clock.get() + index * 0.9) % period) / period;
    return t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.75);
  });
  const dots = useMemo(() => Array.from({ length: 16 }, (_, k) => (k / 16) * Math.PI * 2), []);
  return (
    <Group transform={transform} opacity={opacity}>
      {dots.map((a, k) => (
        <Circle
          key={k}
          cx={Math.cos(a) * p.size}
          cy={Math.sin(a) * p.size}
          r={5}
          color={k % 2 ? '#ffffff' : p.color}
        />
      ))}
    </Group>
  );
}

function Fall({
  p,
  clock,
  H,
  kind,
}: PartProps & { H: number; kind: 'snow' | 'confetti' | 'petals' }) {
  const fallSpeed = kind === 'snow' ? 40 : kind === 'confetti' ? 70 : 34;
  const transform = useDerivedValue(() => {
    const t = clock.get();
    const y = ((p.y + t * fallSpeed * p.speed) % (H + 60)) - 30;
    const x = p.x + Math.sin(t * 0.9 * p.speed + p.phase) * (kind === 'snow' ? 14 : 26);
    const rot = kind === 'snow' ? 0 : t * p.speed * 1.6 + p.phase;
    return [{ translateX: x }, { translateY: y }, { rotate: rot }, { scale: p.size }];
  });
  if (kind === 'snow') {
    return (
      <Group transform={transform}>
        <Circle cx={0} cy={0} r={1} color={withAlpha('#ffffff', 0.85)} />
      </Group>
    );
  }
  if (kind === 'confetti') {
    return (
      <Group transform={transform}>
        <Rect x={-0.6} y={-0.3} width={1.2} height={0.6} color={p.color} />
      </Group>
    );
  }
  return (
    <Group transform={transform} opacity={0.85}>
      <Path path={PETAL} color={p.color} />
    </Group>
  );
}

function Drift({ p, clock, H }: PartProps & { H: number }) {
  const transform = useDerivedValue(() => {
    const t = clock.get();
    const y = H - ((H - p.y + t * 12 * p.speed) % (H + p.size * 2)) + p.size;
    return [{ translateX: p.x + Math.sin(t * 0.4 + p.phase) * 20 }, { translateY: y }];
  });
  const opacity = useDerivedValue(() => 0.25 + 0.2 * Math.sin(clock.get() * 0.8 + p.phase));
  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={p.size}>
        <RadialGradient
          c={vec(0, 0)}
          r={p.size}
          colors={[withAlpha(p.color, 0.5), withAlpha(p.color, 0.3), withAlpha(p.color, 0)]}
          positions={[0, 0.8, 1]}
        />
      </Circle>
    </Group>
  );
}
