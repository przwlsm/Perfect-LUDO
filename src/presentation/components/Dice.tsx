import { StyleSheet, View } from 'react-native';
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
/** Six orthographically projected cube faces, rendered on the native UI thread. */
export function Dice({ value, finish = 'ivory', size = 56, spin, tilt }: DiceProps) {
  const still = useSharedValue(0);
  const angled = useSharedValue(1);
  const colors = DICE_FINISHES[finish] ?? DICE_FINISHES.ivory!;
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel={value ? `Dice showing ${value}` : 'Dice ready to roll'}
      style={{ width: size, height: size }}
    >
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: size * 0.16,
          width: size * 0.72,
          height: size * 0.16,
          borderRadius: size,
          backgroundColor: '#00000035',
          boxShadow: colors.glow ? `0 0 10px ${colors.glow}` : '0 2px 5px #00000025',
        }}
      />
      {FACES.map((face) => (
        <CubeFace
          key={face.value}
          face={face}
          value={value ?? 1}
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
          backgroundColor: colors.face,
          borderRadius: Math.min(3, edge * 0.06),
          borderWidth: 0.6,
          borderColor: colors.edge ?? '#ffffff80',
          overflow: 'hidden',
          backfaceVisibility: 'hidden',
        },
        faceStyle,
      ]}
    >
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
            left: edge * (0.27 + col * 0.23) - edge * 0.075,
            top: edge * (0.27 + row * 0.23) - edge * 0.075,
            width: edge * 0.15,
            height: edge * 0.15,
            borderRadius: edge,
            backgroundColor: colors.pip,
            boxShadow: '0 1px 0 #ffffff50',
            borderTopWidth: 0.7,
            borderTopColor: '#00000060',
          }}
        />
      ))}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, shadeStyle]}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: '#ffffff65',
        }}
      />
    </Animated.View>
  );
}
