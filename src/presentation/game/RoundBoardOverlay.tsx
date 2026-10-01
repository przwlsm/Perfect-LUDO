import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '../components/AppText';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ALL_PLAYER_COLORS, type DieValue, type PlayerColor } from '@/domain';
import { AnimatedDice } from '../components/AnimatedDice';
import { radialGrid, radialPoint, radialShift } from '../board/radialLayout';

/**
 * The 5-6 player table's controls, laid over the round board itself: one
 * shared dice in the centre (the player whose turn it is rolls it) and each
 * player's name on the rim beside their own home, turned to face them when
 * everyone sits around one device.
 */
export function RoundBoardOverlay({
  size,
  colors,
  palette,
  nameOf,
  current,
  canRoll,
  rolling,
  value,
  diceFinish,
  surface,
  faceSeats,
  tilted,
  motionEnabled,
  onRoll,
}: {
  size: number;
  colors: readonly PlayerColor[];
  palette: Record<PlayerColor, string>;
  nameOf(color: PlayerColor): string;
  current: PlayerColor | null;
  canRoll: boolean;
  rolling: boolean;
  value: DieValue | null;
  diceFinish: string;
  surface: string;
  /** Pass & play: turn each name to face the person sitting at that home. */
  faceSeats: boolean;
  /** The 3D board is drawn tilted; names are mapped onto its rim instead of the flat one. */
  tilted: boolean;
  motionEnabled: boolean;
  onRoll(): void;
}) {
  const { t } = useTranslation('game');
  const cell = size / radialGrid(colors.length);
  const tile = Math.max(48, Math.round(size * 0.12));
  const pulse = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = 0;
    if (canRoll && motionEnabled)
      pulse.value = withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    return () => cancelAnimation(pulse);
  }, [canRoll, motionEnabled, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: canRoll ? 0.35 + pulse.value * 0.65 : 0,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  const accent = current ? palette[current] : '#ffffff';

  /**
   * Flat board point to screen point. On the 3D board the round table is
   * seen from a fixed camera (Board3D's radial camera): its top surface
   * appears as an ellipse about 80% as tall as it is wide, a little below
   * centre, and slightly larger toward the viewer. Measured from that
   * camera, so it only needs revisiting if the camera moves.
   */
  function place(x: number, y: number) {
    if (!tilted) return { x, y, scale: 1 };
    const r = size / 2;
    const dx = x - r;
    const dy = y - r;
    const near = 1 + 0.07 * (dy / r);
    return { x: r + dx * 0.977 * near, y: r + 0.06 * r + dy * 0.8, scale: 0.9 * near };
  }

  const middle = place(size / 2, size / 2).y;

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', width: size, height: size }}>
      {colors.map((color) => {
        const seat = ALL_PLAYER_COLORS.indexOf(color);
        // Just outside the home circle, on the rim, along the home's own direction.
        const [row, col] = radialPoint(
          seat + 0.5,
          colors.length,
          8.55 + radialShift(colors.length),
        );
        const at = place((col + 0.5) * cell, (row + 0.5) * cell);
        const angle = -90 + ((seat + 0.5) * 360) / colors.length;
        const active = color === current;
        const width = cell * 4.4 * at.scale;
        const height = cell * 1.05 * at.scale;
        return (
          <View
            key={color}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: at.x - width / 2,
              top: at.y - height / 2,
              width,
              height,
              borderRadius: height / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette[color],
              borderWidth: active ? 2 : 1,
              borderColor: active ? '#ffffff' : '#ffffff80',
              boxShadow: active ? `0 0 10px ${palette[color]}` : undefined,
              transform: [{ rotate: `${faceSeats ? angle - 90 : 0}deg` }],
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: '#ffffff',
                fontWeight: '900',
                fontSize: Math.max(9, cell * 0.55 * at.scale),
                textShadowColor: '#00000080',
                textShadowRadius: 2,
                paddingHorizontal: 4,
              }}
            >
              {nameOf(color)}
            </Text>
          </View>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: size / 2 - tile / 2 - 6,
            top: middle - tile / 2 - 6,
            width: tile + 12,
            height: tile + 12,
            borderRadius: 18,
            borderWidth: 3,
            borderColor: accent,
          },
          ring,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          current ? t('dice.rollA11y', { name: nameOf(current) }) : t('dice.label')
        }
        accessibilityHint={canRoll ? t('dice.yourTurnHint') : t('dice.waitHint')}
        accessibilityState={{ disabled: !canRoll }}
        disabled={!canRoll}
        onPress={onRoll}
        style={{
          position: 'absolute',
          left: size / 2 - tile / 2,
          top: middle - tile / 2,
          width: tile,
          height: tile,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: surface,
          borderWidth: 2.5,
          borderColor: accent,
          boxShadow: `0 0 14px ${accent}99`,
        }}
      >
        <AnimatedDice
          size={tile - 8}
          value={value}
          finish={diceFinish}
          rolling={rolling}
          ready={canRoll}
          motionEnabled={motionEnabled}
        />
      </Pressable>
    </View>
  );
}
