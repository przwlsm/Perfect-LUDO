import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { FestiveEffect } from '@/domain';
import { Text } from '../components/AppText';

/**
 * The festival over the board: a handful of emoji particles with their own
 * slow loops, drawn above the board and below the pieces' touch layer
 * (pointer events pass through). With motion off the scene is still
 * decorated, just still.
 */
export function FestiveEffects({
  effect,
  size,
  motion,
}: {
  effect: FestiveEffect;
  size: number;
  motion: boolean;
}) {
  const scene = useMemo(() => SCENES[effect](size), [effect, size]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {scene.map((p, i) => (
        <Particle key={`${effect}-${i}`} particle={p} size={size} motion={motion} />
      ))}
    </View>
  );
}

type Motion = 'twinkle' | 'fall' | 'drift' | 'sway' | 'pulse' | 'glide' | 'still';

interface ParticleSpec {
  readonly glyph: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly motion: Motion;
  readonly duration: number;
  readonly delay: number;
  readonly opacity?: number;
  /** For colour splashes: a tinted circle instead of a glyph. */
  readonly color?: string;
  /** Text colour for plain glyphs (dots, stars); emoji keep their own. */
  readonly tint?: string;
}

function Particle({
  particle,
  size,
  motion,
}: {
  particle: ParticleSpec;
  size: number;
  motion: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    if (!motion || particle.motion === 'still') return;
    const loop = withRepeat(
      withSequence(
        withTiming(1, { duration: particle.duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, {
          duration:
            particle.motion === 'fall' || particle.motion === 'glide' ? 0 : particle.duration,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
    );
    t.value = withDelay(particle.delay, loop);
    return () => cancelAnimation(t);
  }, [motion, particle, t]);

  const style = useAnimatedStyle(() => {
    const v = t.value;
    switch (particle.motion) {
      case 'twinkle':
        return { opacity: 0.25 + 0.75 * v, transform: [{ scale: 0.7 + 0.5 * v }] };
      case 'fall':
        return {
          opacity: v < 0.05 ? v * 20 : v > 0.9 ? (1 - v) * 10 : 1,
          transform: [{ translateY: v * size * 1.1 }, { translateX: Math.sin(v * 6) * 10 }],
        };
      case 'drift':
        return { opacity: 0.3 + 0.45 * v, transform: [{ scale: 0.8 + 0.4 * v }] };
      case 'sway':
        return { transform: [{ rotate: `${-8 + 16 * v}deg` }] };
      case 'pulse':
        return { opacity: 0.7 + 0.3 * v, transform: [{ scale: 0.92 + 0.16 * v }] };
      case 'glide':
        return { transform: [{ translateX: -60 + v * (size + 120) }] };
      default:
        return {};
    }
  });

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: particle.x, top: particle.y, opacity: particle.opacity ?? 1 },
        style,
      ]}
    >
      {particle.color ? (
        <View
          style={{
            width: particle.fontSize,
            height: particle.fontSize,
            borderRadius: particle.fontSize / 2,
            backgroundColor: particle.color,
          }}
        />
      ) : (
        <Text
          style={{
            fontSize: particle.fontSize,
            lineHeight: particle.fontSize * 1.25,
            ...(particle.tint
              ? { color: particle.tint, textShadowColor: '#00000055', textShadowRadius: 2 }
              : {}),
          }}
        >
          {particle.glyph}
        </Text>
      )}
    </Animated.View>
  );
}

/** A fixed pseudo-random sequence, so a board looks the same every time it opens. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SCENES: Record<FestiveEffect, (size: number) => ParticleSpec[]> = {
  diwali: (size) => {
    const r = seeded(11);
    const sparkles: ParticleSpec[] = Array.from({ length: 14 }, () => ({
      glyph: '✨',
      x: r() * size,
      y: r() * size,
      fontSize: 10 + r() * 10,
      motion: 'twinkle',
      duration: 900 + r() * 1400,
      delay: r() * 2000,
    }));
    const diyas: ParticleSpec[] = [
      [0.02, 0.02],
      [0.9, 0.02],
      [0.02, 0.9],
      [0.9, 0.9],
    ].map(([x, y], i) => ({
      glyph: '🪔',
      x: x! * size,
      y: y! * size,
      fontSize: size * 0.07,
      motion: 'pulse',
      duration: 1200 + i * 150,
      delay: i * 300,
    }));
    return [...diyas, ...sparkles];
  },
  holi: (size) => {
    const r = seeded(22);
    const colors = ['#ff3d7f', '#ffb000', '#2ad17e', '#3f8cff', '#b14cff', '#ff6a00'];
    // Splashes stay over the four yards' outer corners, clear of the track
    // and the coins on it, so the board reads as well as on a plain table.
    return Array.from({ length: 12 }, (_, i) => {
      const fontSize = 22 + r() * 30;
      const left = i % 2 === 0;
      const top = i % 4 < 2;
      const x = (left ? r() * 0.3 : 0.7 + r() * 0.3) * size - fontSize / 2;
      const y = (top ? r() * 0.3 : 0.7 + r() * 0.3) * size - fontSize / 2;
      return {
        glyph: '',
        color: `${colors[i % colors.length]!}59`,
        x,
        y,
        fontSize,
        motion: 'drift' as const,
        duration: 1800 + r() * 2200,
        delay: r() * 2500,
      };
    });
  },
  onam: (size) => {
    const r = seeded(33);
    const petals = ['🌸', '🌼', '🌺', '🌻'];
    return Array.from({ length: 10 }, (_, i) => ({
      glyph: petals[i % petals.length]!,
      x: r() * size,
      y: -30 - r() * size * 0.5,
      fontSize: 14 + r() * 10,
      motion: 'fall',
      duration: 6000 + r() * 5000,
      delay: r() * 6000,
    }));
  },
  pongal: (size) => {
    const r = seeded(44);
    const dots: ParticleSpec[] = Array.from({ length: 16 }, () => ({
      glyph: '•',
      tint: '#ffffff',
      x: r() * size,
      y: r() * size,
      fontSize: 12,
      motion: 'still',
      duration: 0,
      delay: 0,
      opacity: 0.85,
    }));
    return [
      {
        glyph: '☀️',
        x: size * 0.45,
        y: -4,
        fontSize: size * 0.08,
        motion: 'pulse',
        duration: 1600,
        delay: 0,
      },
      {
        glyph: '🌾',
        x: 2,
        y: size * 0.86,
        fontSize: size * 0.07,
        motion: 'sway',
        duration: 1800,
        delay: 0,
      },
      {
        glyph: '🌾',
        x: size * 0.9,
        y: size * 0.86,
        fontSize: size * 0.07,
        motion: 'sway',
        duration: 2100,
        delay: 400,
      },
      {
        glyph: '🍯',
        x: size * 0.46,
        y: size * 0.9,
        fontSize: size * 0.06,
        motion: 'still',
        duration: 0,
        delay: 0,
      },
      ...dots,
    ];
  },
  eid: (size) => {
    const r = seeded(55);
    const stars: ParticleSpec[] = Array.from({ length: 10 }, () => ({
      glyph: '✦',
      tint: '#f6d365',
      x: r() * size,
      y: r() * size * 0.5,
      fontSize: 8 + r() * 8,
      motion: 'twinkle',
      duration: 1200 + r() * 1500,
      delay: r() * 2000,
      opacity: 0.9,
    }));
    return [
      {
        glyph: '🌙',
        x: size * 0.8,
        y: 2,
        fontSize: size * 0.09,
        motion: 'pulse',
        duration: 2400,
        delay: 0,
      },
      { glyph: '🏮', x: 4, y: 2, fontSize: size * 0.07, motion: 'sway', duration: 1700, delay: 0 },
      {
        glyph: '🏮',
        x: 4,
        y: size * 0.88,
        fontSize: size * 0.07,
        motion: 'sway',
        duration: 1900,
        delay: 500,
      },
      {
        glyph: '🏮',
        x: size * 0.9,
        y: size * 0.88,
        fontSize: size * 0.07,
        motion: 'sway',
        duration: 2100,
        delay: 900,
      },
      ...stars,
    ];
  },
  christmas: (size) => {
    const r = seeded(66);
    const snow: ParticleSpec[] = Array.from({ length: 16 }, () => ({
      glyph: '❄️',
      x: r() * size,
      y: -30 - r() * size * 0.6,
      fontSize: 9 + r() * 9,
      motion: 'fall',
      duration: 5000 + r() * 5000,
      delay: r() * 5000,
      opacity: 0.9,
    }));
    return [
      {
        glyph: '🎅',
        x: 0,
        y: -2,
        fontSize: size * 0.08,
        motion: 'glide',
        duration: 9000,
        delay: 1500,
      },
      {
        glyph: '🎄',
        x: 2,
        y: size * 0.88,
        fontSize: size * 0.07,
        motion: 'sway',
        duration: 2200,
        delay: 0,
      },
      {
        glyph: '🎄',
        x: size * 0.9,
        y: size * 0.88,
        fontSize: size * 0.07,
        motion: 'sway',
        duration: 2500,
        delay: 600,
      },
      ...snow,
    ];
  },
};
