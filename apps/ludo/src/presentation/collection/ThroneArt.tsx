import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { CUPS, type CupDef } from '@/domain';
import { Shine } from '../components/Live';

/**
 * How grand a throne is, 0 (the Wooden Throne) to 1 (the Legend's Throne):
 * its place on the Royal Road. The dearer the hall, the more it shines.
 */
export function throneRadiance(cup: CupDef): number {
  const i = CUPS.findIndex((c) => c.id === cup.id);
  return i <= 0 ? 0 : i / (CUPS.length - 1);
}

/** Where sparkles sit around the throne, as fractions of the art box; the grander ones show more. */
const SPARKLES = [
  { x: 0.86, y: 0.16, s: 1 },
  { x: 0.1, y: 0.3, s: 0.8 },
  { x: 0.8, y: 0.62, s: 0.7 },
  { x: 0.16, y: 0.74, s: 0.9 },
  { x: 0.5, y: 0.02, s: 0.75 },
  { x: 0.02, y: 0.08, s: 0.6 },
  { x: 0.96, y: 0.42, s: 0.65 },
  { x: 0.3, y: 0.06, s: 0.55 },
] as const;
/** Sparkles per hall, Wooden to Legend's. */
const SPARKLE_COUNT = [0, 0, 1, 2, 3, 4, 6, 8] as const;

/** A four-pointed star that twinkles in and out on its own beat. */
function Sparkle({
  x,
  y,
  size,
  color,
  delay,
  active,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  active: boolean;
}) {
  const t = useSharedValue(active ? 0 : 0.7);
  useEffect(() => {
    cancelAnimation(t);
    t.set(active ? 0 : 0.7);
    if (active)
      t.set(
        withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 680, easing: Easing.in(Easing.quad) }),
              withTiming(0, { duration: 900 }),
            ),
            -1,
          ),
        ),
      );
    return () => cancelAnimation(t);
  }, [active, delay, t]);
  const anim = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [
      { scale: interpolate(t.get(), [0, 1], [0.3, 1]) },
      { rotate: `${interpolate(t.get(), [0, 1], [0, 45])}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size },
        anim,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={color} />
        <Circle cx="10" cy="10" r="2.2" fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
}

/** Rays behind the grander thrones, turning slowly while motion is on. */
function Rays({
  gid,
  size,
  count,
  color,
  opacity,
  active,
}: {
  gid: string;
  size: number;
  count: number;
  color: string;
  opacity: number;
  active: boolean;
}) {
  const spin = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(spin);
    spin.set(0);
    if (active)
      spin.set(withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1));
    return () => cancelAnimation(spin);
  }, [active, spin]);
  const anim = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const step = 360 / count;
  const d = Array.from({ length: count }, (_, i) => {
    const a0 = ((i * step - step / 5) * Math.PI) / 180;
    const a1 = ((i * step + step / 5) * Math.PI) / 180;
    return `M50 50L${(50 + Math.cos(a0) * 50).toFixed(1)} ${(50 + Math.sin(a0) * 50).toFixed(1)}L${(50 + Math.cos(a1) * 50).toFixed(1)} ${(50 + Math.sin(a1) * 50).toFixed(1)}Z`;
  }).join('');
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, opacity }, anim]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={gid} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity="0.9" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={d} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

/** The halo behind a lit throne; the top halls breathe slowly. */
function Halo({
  gid,
  size,
  color,
  strength,
  breathe,
}: {
  gid: string;
  size: number;
  color: string;
  strength: number;
  breathe: boolean;
}) {
  const t = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(t);
    t.set(1);
    if (breathe)
      t.set(
        withRepeat(
          withTiming(0.55, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
    return () => cancelAnimation(t);
  }, [breathe, t]);
  const anim = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ scale: interpolate(t.get(), [0.55, 1], [0.92, 1]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size }, anim]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={gid} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="0.55" stopColor={color} stopOpacity={strength * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * A cup's throne: a tall back with a crown, a cushioned seat and two legs,
 * in the hall's colours. Lit thrones sit in a halo whose brightness grows
 * with the hall: the dearer the cup, the bigger the glow, the more rays and
 * sparkles, and the more often light sweeps across it. The Diamond and
 * Legend's thrones add jewels and a breathing glow. Unlit thrones are a dim
 * silhouette waiting to be claimed. With `shine` off nothing moves.
 */
export function ThroneArt({
  cup,
  won,
  size = 96,
  shine = won,
}: {
  cup: CupDef;
  /** Lit: won, or shown as the prize on offer. */
  won: boolean;
  size?: number;
  shine?: boolean;
}) {
  const { base, light, gem } = cup.throne;
  const id = `throne-${cup.id}`;
  const h = size * 1.25;
  const radiance = throneRadiance(cup);
  const tier = Math.round(radiance * (CUPS.length - 1));
  const lit = won;
  const moving = lit && shine;
  const glowColor = gem ?? light;
  const sparkles = lit ? SPARKLES.slice(0, SPARKLE_COUNT[tier] ?? 0) : [];
  const grand = tier >= 6;
  const halo = size * (1.25 + radiance * 0.55);
  return (
    <View style={{ width: size, height: h, alignItems: 'center', justifyContent: 'center' }}>
      {lit && (
        <Halo
          gid={`${id}-halo`}
          size={halo}
          color={glowColor}
          strength={0.32 + radiance * 0.4}
          breathe={moving && tier >= 5}
        />
      )}
      {lit && tier >= 3 && (
        <Rays
          gid={`${id}-rays`}
          size={halo * 1.1}
          count={8 + (tier - 3) * 2}
          color={light}
          opacity={0.25 + radiance * 0.4}
          active={moving}
        />
      )}
      <Svg width={size} height={h} viewBox="0 0 100 125" opacity={lit ? 1 : 0.38}>
        <Defs>
          <LinearGradient id={`${id}-back`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.5" stopColor={base} />
            <Stop offset="1" stopColor={base} />
          </LinearGradient>
          <LinearGradient id={`${id}-seat`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="1" stopColor={base} />
          </LinearGradient>
          <LinearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} stopOpacity={lit ? 0.35 + radiance * 0.35 : 0} />
            <Stop offset="1" stopColor={light} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.12 + radiance * 0.28} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {/* The pool of light under a lit throne, wider for the grander halls. */}
        <Ellipse
          cx="50"
          cy="112"
          rx={40 + radiance * 10}
          ry={9 + radiance * 3}
          fill={glowColor}
          opacity={lit ? 0.22 + radiance * 0.3 : 0.08}
        />
        <Rect x="10" y="0" width="80" height="110" fill={`url(#${id}-glow)`} rx="40" />
        {/* The tall back with a scalloped crown. */}
        <Path
          d="M22 102 L22 30 Q22 18 32 16 L36 24 L44 10 L50 20 L56 10 L64 24 L68 16 Q78 18 78 30 L78 102 Z"
          fill={`url(#${id}-back)`}
          stroke={tier >= 3 ? light : base}
          strokeWidth="2"
        />
        {/* A polished gleam down the back, stronger on the precious thrones. */}
        <Path d="M30 30 L40 18 L44 102 L34 102 Z" fill={`url(#${id}-gloss)`} />
        {/* The inner panel of the back. */}
        <Rect x="30" y="34" width="40" height="46" rx="8" fill="#00000022" />
        <Rect x="34" y="38" width="32" height="38" rx="6" fill={light} opacity="0.18" />
        {/* Diamond-cut facets on the two grandest backs. */}
        {grand && (
          <>
            <Path d="M50 42 L62 56 L50 72 L38 56 Z" fill={glowColor} opacity="0.55" />
            <Path d="M50 42 L62 56 L50 56 Z" fill="#ffffff" opacity="0.55" />
            <Path d="M38 56 L50 56 L50 72 Z" fill="#ffffff" opacity="0.2" />
          </>
        )}
        {/* The seat cushion and the armrests. */}
        <Rect
          x="14"
          y="76"
          width="72"
          height="18"
          rx="7"
          fill={`url(#${id}-seat)`}
          stroke={base}
          strokeWidth="2"
        />
        <Rect x="10" y="66" width="12" height="30" rx="5" fill={base} />
        <Rect x="78" y="66" width="12" height="30" rx="5" fill={base} />
        {/* Armrest knobs: jewels from the Ruby Throne up, plain otherwise. */}
        <Circle
          cx="16"
          cy="66"
          r="6"
          fill={tier >= 5 && gem ? gem : light}
          stroke={tier >= 5 ? '#ffffff' : 'none'}
          strokeWidth="1.2"
        />
        <Circle
          cx="84"
          cy="66"
          r="6"
          fill={tier >= 5 && gem ? gem : light}
          stroke={tier >= 5 ? '#ffffff' : 'none'}
          strokeWidth="1.2"
        />
        {tier >= 5 && (
          <>
            <Circle cx="14.5" cy="64.5" r="1.8" fill="#ffffff" opacity="0.85" />
            <Circle cx="82.5" cy="64.5" r="1.8" fill="#ffffff" opacity="0.85" />
          </>
        )}
        {/* The legs. */}
        <Rect x="18" y="94" width="10" height="16" rx="3" fill={base} />
        <Rect x="72" y="94" width="10" height="16" rx="3" fill={base} />
        {/* Studs on the crown's side peaks for the two grandest thrones. */}
        {grand && gem && (
          <>
            <Circle cx="36" cy="22" r="3.2" fill={gem} stroke="#ffffff" strokeWidth="1" />
            <Circle cx="64" cy="22" r="3.2" fill={gem} stroke="#ffffff" strokeWidth="1" />
            <Circle cx="44" cy="13" r="2.4" fill="#ffffff" />
            <Circle cx="56" cy="13" r="2.4" fill="#ffffff" />
          </>
        )}
        {/* The jewel on the crown; wooden thrones have none. */}
        {gem && (
          <>
            {lit && tier >= 4 && (
              <Circle
                cx="50"
                cy="26"
                r={9 + radiance * 4}
                fill={gem}
                opacity={0.25 + radiance * 0.2}
              />
            )}
            <Circle
              cx="50"
              cy="26"
              r={6.5 + (grand ? 1.5 : 0)}
              fill={gem}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {grand ? (
              <>
                <Path d="M50 19 L56 26 L50 33 L44 26 Z" fill="#ffffff" opacity="0.45" />
                <Path d="M50 19 L56 26 L50 26 Z" fill="#ffffff" opacity="0.6" />
              </>
            ) : (
              <Circle cx="48" cy="24" r="2" fill="#ffffff" opacity="0.8" />
            )}
          </>
        )}
      </Svg>
      {moving && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: h * 0.08,
            width: size * 0.6,
            height: h * 0.74,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Dearer thrones catch the light more often, and more brightly. */}
          <Shine
            active
            width={size * 1.4}
            every={Math.round(3800 - radiance * 2600)}
            strength={0.18 + radiance * 0.4}
          />
        </View>
      )}
      {sparkles.map((p, i) => (
        <Sparkle
          key={i}
          x={p.x * size}
          y={p.y * h}
          size={size * 0.16 * p.s * (0.85 + radiance * 0.4)}
          color={i % 2 ? light : '#fff7d6'}
          delay={i * 330}
          active={moving}
        />
      ))}
    </View>
  );
}
