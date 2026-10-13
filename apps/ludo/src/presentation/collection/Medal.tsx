import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Shine } from '../components/Live';

/** Medal metal by tier: 0 locked, 1 bronze, 2 silver, 3 gold, 4 platinum. */
export const TIER_COLORS = [
  { light: '#9aa0ad', base: '#5d6370', dark: '#3b404b', ink: '#e6e8ee' },
  { light: '#f0b27a', base: '#c2743a', dark: '#7a4320', ink: '#fff3e6' },
  { light: '#f4f6fb', base: '#b4bccb', dark: '#6f788a', ink: '#1d2434' },
  { light: '#ffe79a', base: '#f2b733', dark: '#a86e07', ink: '#3a2a00' },
  { light: '#e9fbff', base: '#8ee3f5', dark: '#2a8aa8', ink: '#063443' },
] as const;

/**
 * An achievement medal: a ribbon, a metal disc in the tier's colour and the
 * achievement's icon in the middle. Locked medals are a grey silhouette.
 * The top tiers get a slow shine sweep, so a full shelf glitters.
 */
export function Medal({
  icon,
  tier,
  size = 72,
  shine = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tier: number;
  size?: number;
  shine?: boolean;
}) {
  const c = TIER_COLORS[Math.max(0, Math.min(4, tier))]!;
  const locked = tier === 0;
  const id = `medal-${tier}`;
  return (
    <View style={{ width: size, height: size * 1.18, alignItems: 'center' }}>
      <Svg width={size} height={size * 1.18} viewBox="0 0 100 118">
        <Defs>
          <LinearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={locked ? '#6b7280' : '#e11d48'} />
            <Stop offset="1" stopColor={locked ? '#4b5563' : '#9f1239'} />
          </LinearGradient>
          <RadialGradient id={`${id}-disc`} cx="0.35" cy="0.3" r="0.8">
            <Stop offset="0" stopColor={c.light} />
            <Stop offset="0.55" stopColor={c.base} />
            <Stop offset="1" stopColor={c.dark} />
          </RadialGradient>
        </Defs>
        {/* Ribbon: two tails behind the disc. */}
        <Path d="M30 0 L50 34 L70 0 L84 0 L58 48 L42 48 L16 0 Z" fill={`url(#${id}-ribbon)`} />
        <Path d="M40 0 L50 18 L60 0 Z" fill="#00000033" />
        {/* The disc with a darker rim and an inner ring. */}
        <Circle cx="50" cy="76" r="40" fill={c.dark} />
        <Circle cx="50" cy="76" r="36" fill={`url(#${id}-disc)`} />
        <Circle
          cx="50"
          cy="76"
          r="29"
          fill="none"
          stroke={c.dark}
          strokeWidth="2.5"
          strokeDasharray={locked ? '4 4' : undefined}
          opacity={0.7}
        />
        {/* A soft highlight on the upper left. */}
        <Circle cx="36" cy="60" r="10" fill="#ffffff" opacity={locked ? 0.08 : 0.28} />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: size * 1.18 * (76 / 118) - size * 0.19,
          width: size * 0.38,
          height: size * 0.38,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={size * 0.3} color={locked ? '#b8bcc6' : c.ink} />
      </View>
      {shine && !locked && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: size * 1.18 * (36 / 118),
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: size * 0.4,
            overflow: 'hidden',
          }}
        >
          <Shine active width={size * 1.2} every={2600 + tier * 400} />
        </View>
      )}
    </View>
  );
}
