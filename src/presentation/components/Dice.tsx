import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import type { DieValue } from '@/domain';
import { DICE_FINISHES } from '../theme/themes';
import { FACES, PIPS, projectFace } from './diceGeometry';

export interface DiceProps {
  readonly value: DieValue | null;
  readonly finish?: string;
  readonly size?: number;
  readonly spin?: SharedValue<number>;
  readonly tilt?: SharedValue<number>;
}

/** '#rrggbb' mixed toward white (amount > 0) or black (amount < 0). */
function mix(hex: string, amount: number): string {
  const to = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (to - v) * t)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Six orthographically projected cube faces, rendered on the native UI thread. */
export function Dice({ value, finish = 'ivory', size = 56, spin, tilt }: DiceProps) {
  const { t } = useTranslation('game');
  const still = useSharedValue(0);
  const angled = useSharedValue(1);
  const colors = DICE_FINISHES[finish] ?? DICE_FINISHES.ivory!;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={value ? t('dice.showing', { value }) : t('dice.readyToRoll')}
      style={{ width: size, height: size }}
    >
      <View
        style={{
          position: 'absolute',
          bottom: -size * 0.02,
          left: size * 0.12,
          width: size * 0.76,
          height: size * 0.13,
          borderRadius: size,
          backgroundColor: '#00000028',
          boxShadow: colors.glow ? `0 0 12px ${colors.glow}` : '0 3px 8px #00000030',
        }}
      />
      {FACES.map((face) => (
        <CubeFace
          key={face.value}
          face={face}
          // A die waiting to roll poses as a five, the look the store and
          // profile show; a lone centre pip reads as a blank at small sizes.
          value={value ?? 5}
          size={size}
          colors={colors}
          spin={spin ?? still}
          tilt={tilt ?? angled}
        />
      ))}
    </View>
  );
}

function CubeFace({
  face,
  value,
  size,
  colors,
  spin,
  tilt,
}: {
  face: (typeof FACES)[number];
  value: DieValue;
  size: number;
  colors: (typeof DICE_FINISHES)[string];
  spin: SharedValue<number>;
  tilt: SharedValue<number>;
}) {
  // A cube's corner reaches edge * sqrt(3) / 2 from its centre, so this keeps
  // even the most diagonal tumbling pose inside the `size` box instead of
  // poking through the control's border and over its label.
  const edge = size * 0.57;
  // Each finish keeps its personality: its design radius (drawn for a 56px
  // die) scales with the face and gets a rounder floor so no die looks boxy.
  const radius = Math.min(
    edge * 0.3,
    Math.max(edge * 0.16, ((colors.radius ?? 10) / 56) * edge * 1.4),
  );
  const pipR = edge * 0.1;
  const faceStyle = useAnimatedStyle(() => {
    const p = projectFace(face, value, spin.value, edge, tilt.value);
    return {
      opacity: p.visible ? 1 : 0,
      zIndex: Math.round(p.depth * 100) + 100,
      transform: p.transform,
    };
  });
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: projectFace(face, value, spin.value, edge, tilt.value).shade,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: (size - edge) / 2,
          top: (size - edge) / 2 - 1,
          width: edge,
          height: edge,
          borderRadius: radius,
          borderWidth: Math.max(0.8, edge * 0.022),
          borderColor: colors.edge ?? mix(colors.face, -0.16),
          overflow: 'hidden',
          backfaceVisibility: 'hidden',
        },
        faceStyle,
      ]}
    >
      {/* The face itself: a soft diagonal sheen instead of a flat fill. */}
      <LinearGradient
        colors={[mix(colors.face, 0.1), colors.face, mix(colors.face, -0.07)]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {colors.wood &&
        [0.2, 0.4, 0.6, 0.8].map((top) => (
          <View
            key={top}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: top * edge,
              height: 1,
              backgroundColor: '#714a2630',
            }}
          />
        ))}
      {PIPS[face.value].map(([row, col]) => (
        <View
          key={`${row}-${col}`}
          style={{
            position: 'absolute',
            left: edge * (0.26 + col * 0.24) - pipR,
            top: edge * (0.26 + row * 0.24) - pipR,
            width: pipR * 2,
            height: pipR * 2,
            borderRadius: pipR,
            backgroundColor: colors.pip,
            // Pressed into the face: a dark lip above, a light catch below.
            boxShadow: `0 ${Math.max(1, edge * 0.02)}px 0 ${mix(colors.face, 0.24)}, inset 0 ${Math.max(1, edge * 0.025)}px ${Math.max(1, edge * 0.03)}px #00000055`,
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: pipR * 0.42,
              top: pipR * 0.32,
              width: pipR * 0.62,
              height: pipR * 0.5,
              borderRadius: pipR,
              backgroundColor: mix(colors.pip, 0.35),
              opacity: 0.55,
            }}
          />
        </View>
      ))}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, shadeStyle]}
      />
      {/* A thin catch of light along the top edge. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: radius * 0.6,
          right: radius * 0.6,
          height: Math.max(1, edge * 0.02),
          borderRadius: edge,
          backgroundColor: '#ffffff55',
        }}
      />
    </Animated.View>
  );
}
