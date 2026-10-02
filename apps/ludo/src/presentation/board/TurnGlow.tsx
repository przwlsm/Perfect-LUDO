import { useEffect } from 'react';
import { View } from 'react-native';
import type { GameState, PlayerColor } from '@/domain';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * A soft halo around the home of the player whose turn it is, so everyone
 * can see at a glance who rolls next. It breathes gently; with motion
 * turned off it simply stays lit. Never takes touches, so coins in the
 * yard stay tappable.
 */
export function TurnGlow({
  color,
  left,
  top,
  width,
  height,
  radius,
  ring,
  motionEnabled,
}: {
  color: string;
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  /** Thickness of the bright rim, in pixels. */
  ring: number;
  motionEnabled: boolean;
}) {
  const pulse = usePulse(motionEnabled);
  const breathe = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.get() * 0.45,
    transform: [{ scale: 0.985 + pulse.get() * 0.03 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top,
          width,
          height,
          borderRadius: radius,
          borderWidth: ring,
          borderColor: '#ffffff',
          // A white rim, then the player's colour spilling softly outwards.
          boxShadow: `0 0 ${ring * 3}px ${ring * 1.5}px ${color}, inset 0 0 ${ring * 3}px ${color}`,
        },
        breathe,
      ]}
    />
  );
}

/** The colour whose turn it is, or null once the game is over. */
export function turnColorOf(state: GameState): PlayerColor | null {
  if (state.status === 'FINISHED') return null;
  return state.players[state.currentPlayerIndex]?.color ?? null;
}

/** 0.45 to 1 and back, gently, forever; a steady 1 with motion off. */
function usePulse(motionEnabled: boolean) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(pulse);
    pulse.set(1);
    if (motionEnabled) {
      pulse.set(0.45);
      pulse.set(
        withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true),
      );
    }
    return () => cancelAnimation(pulse);
  }, [motionEnabled, pulse]);
  return pulse;
}

type Point = { x: number; y: number };

/**
 * TurnGlow for the round table's triangle homes: the triangle itself lights
 * up softly and its three edges glow, white with the player's colour around.
 * Drawn from views (a border-built triangle and three bars), since a shadow
 * cannot follow a triangle's outline.
 */
export function TurnGlowTriangle({
  color,
  apex,
  left,
  right,
  ring,
  motionEnabled,
}: {
  color: string;
  apex: Point;
  left: Point;
  right: Point;
  ring: number;
  motionEnabled: boolean;
}) {
  const pulse = usePulse(motionEnabled);
  const light = useAnimatedStyle(() => ({ opacity: (pulse.get() - 0.45) * 0.5 }));
  const edges = useAnimatedStyle(() => ({ opacity: 0.55 + pulse.get() * 0.45 }));

  const mid = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  const base = Math.hypot(right.x - left.x, right.y - left.y);
  const height = Math.hypot(apex.x - mid.x, apex.y - mid.y);
  const turn = (Math.atan2(apex.y - mid.y, apex.x - mid.x) * 180) / Math.PI + 90;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: (apex.x + mid.x) / 2 - base / 2,
            top: (apex.y + mid.y) / 2 - height / 2,
            width: 0,
            height: 0,
            borderLeftWidth: base / 2,
            borderRightWidth: base / 2,
            borderBottomWidth: height,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#ffffff',
            transform: [{ rotate: `${turn}deg` }],
          },
          light,
        ]}
      />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, edges]}>
        {(
          [
            [apex, left],
            [left, right],
            [right, apex],
          ] as const
        ).map(([from, to], i) => {
          const length = Math.hypot(to.x - from.x, to.y - from.y) + ring;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: (from.x + to.x) / 2 - length / 2,
                top: (from.y + to.y) / 2 - ring / 2,
                width: length,
                height: ring,
                borderRadius: ring,
                backgroundColor: '#ffffff',
                boxShadow: `0 0 ${ring * 3}px ${ring}px ${color}`,
                transform: [{ rotate: `${Math.atan2(to.y - from.y, to.x - from.x)}rad` }],
              }}
            />
          );
        })}
      </Animated.View>
    </>
  );
}
