import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { TURN_SECONDS, type DieValue } from '@/domain';
import { AnimatedDice } from '../components/AnimatedDice';
import { ui } from '../theme/themes';

/**
 * One seat's corner of the table: the player's token and name beside a
 * raised dice tile. The whole panel is the roll button, so the target is
 * large. The active seat glows in its colour, and when it is this device's
 * turn to roll an arrow pulses beside the dice pointing at it.
 */
export function PlayerPanel({
  color,
  label,
  width,
  height,
  mirrored,
  rotated,
  active,
  canRoll,
  rolling,
  value,
  diceFinish,
  surface,
  accent,
  motionEnabled,
  onRoll,
  secondsLeft = null,
  lives = null,
}: {
  /** Online only: lifelines left of the total, and whether the player is out. */
  lives?: { left: number; total: number; out: boolean } | null;
  /** Online turn clock for the active seat; null when there is none. */
  secondsLeft?: number | null;
  color: string;
  label: string;
  width: number;
  height: number;
  /** Dice on the left, token on the right: for panels on the right of the table. */
  mirrored: boolean;
  /** Turned to face a player across the table (pass & play only). */
  rotated: boolean;
  active: boolean;
  canRoll: boolean;
  rolling: boolean;
  value: DieValue | null;
  diceFinish: string;
  surface: string;
  accent: string;
  motionEnabled: boolean;
  onRoll(): void;
}) {
  const tile = height - 12;
  const token = Math.max(20, Math.round(height * 0.38));
  const nudge = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(nudge);
    nudge.value = 0;
    if (canRoll && motionEnabled)
      nudge.value = withRepeat(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    return () => cancelAnimation(nudge);
  }, [canRoll, motionEnabled, nudge]);

  // The arrow sits on the board-facing side of the dice and points back at it.
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (mirrored ? -1 : 1) * nudge.value * 5 }],
  }));

  const identity = (
    <View style={{ alignItems: 'center', gap: 3, flexShrink: 1, minWidth: 0 }}>
      <View
        style={{
          width: token,
          height: token,
          borderRadius: token,
          backgroundColor: color,
          borderWidth: 3,
          borderColor: '#ffffffdd',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px #00000060',
        }}
      >
        <View
          style={{
            width: token * 0.34,
            height: token * 0.34,
            borderRadius: token,
            backgroundColor: '#ffffff90',
          }}
        />
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 0.3,
          color: active ? ui.text : ui.muted,
          maxWidth: active ? width - tile - 26 : width - 20,
        }}
      >
        {label}
      </Text>
      {lives &&
        (lives.out ? (
          <Text style={{ color: ui.danger, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }}>
            OUT
          </Text>
        ) : (
          <View
            accessible
            accessibilityLabel={`${lives.left} of ${lives.total} lifelines left`}
            style={{ flexDirection: 'row', gap: 2 }}
          >
            {Array.from({ length: lives.total }, (_, i) => (
              <Text
                key={i}
                style={{ fontSize: 8, color: i < lives.left ? '#f43f5e' : '#ffffff30' }}
              >
                ♥
              </Text>
            ))}
          </View>
        ))}
    </View>
  );

  const dice = (
    <View
      style={{
        width: tile,
        height: tile,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? `${color}26` : '#00000030',
        borderWidth: 1.5,
        borderColor: active ? `${color}aa` : '#ffffff1f',
        borderTopColor: active ? color : '#ffffff35',
      }}
    >
      <AnimatedDice
        size={tile - 6}
        value={value}
        finish={diceFinish}
        rolling={rolling}
        ready={canRoll}
        motionEnabled={motionEnabled}
      />
    </View>
  );

  const arrow = (
    <Animated.Text
      style={[
        { fontSize: Math.round(height * 0.32), color: accent, opacity: canRoll ? 1 : 0 },
        arrowStyle,
      ]}
    >
      {mirrored ? '▶' : '◀'}
    </Animated.Text>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: roll dice`}
      accessibilityHint={canRoll ? 'Your turn. Tap to roll.' : 'Wait for your turn.'}
      accessibilityState={{ disabled: !canRoll }}
      disabled={!canRoll}
      onPress={onRoll}
      style={{
        width,
        height,
        borderRadius: 18,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        backgroundColor: surface,
        borderWidth: 2,
        borderColor: active ? color : `${color}40`,
        boxShadow: active ? `0 0 16px ${color}90` : '0 4px 10px #00000055',
        opacity: lives?.out ? 0.45 : active ? 1 : 0.82,
        transform: [{ rotate: rotated ? '180deg' : '0deg' }],
      }}
    >
      {active && secondsLeft !== null && (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              bottom: 3,
              height: 3,
              borderRadius: 2,
              backgroundColor: '#ffffff18',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min(100, (secondsLeft / TURN_SECONDS) * 100)}%`,
                height: '100%',
                backgroundColor: secondsLeft <= 5 ? ui.danger : color,
              }}
            />
          </View>
          <View
            pointerEvents="none"
            accessibilityLabel={`${secondsLeft} seconds left`}
            style={{
              position: 'absolute',
              top: -9,
              [mirrored ? 'left' : 'right']: 10,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 8,
              backgroundColor: secondsLeft <= 5 ? ui.danger : '#0e1322',
              borderWidth: 1,
              borderColor: secondsLeft <= 5 ? ui.danger : color,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{secondsLeft}s</Text>
          </View>
        </>
      )}
      {/* One die on the table: only the seat whose turn it is shows one. */}
      {!active ? (
        <View style={{ flex: 1, alignItems: 'center' }}>{identity}</View>
      ) : mirrored ? (
        <>
          {arrow}
          {dice}
          {identity}
        </>
      ) : (
        <>
          {identity}
          {dice}
          {arrow}
        </>
      )}
    </Pressable>
  );
}
