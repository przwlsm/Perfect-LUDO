import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { DieValue } from '@/domain';
import { AnimatedDice } from './AnimatedDice';
import { useUi } from '../theme/AppearanceProvider';

/** The four classic colours, clockwise from the top left as on the board. */
const YARDS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'] as const;
const FACES: readonly DieValue[] = [6, 3, 5, 1, 4, 2];
/** One roll of the die: it leaps, tumbles, lands with a squash, then rests. */
const ROLL_MS = 1500;
const TUMBLE_MS = 650;

/**
 * The centrepiece of every big loading moment: a little Ludo board with a
 * die tumbling and bouncing on it while four coins race round the board.
 * With motion off it is a still picture (the die showing a six).
 */
export function DiceBoard({ size, motionEnabled }: { size: number; motionEnabled: boolean }) {
  const ui = useUi();
  const day = ui.scheme === 'light';
  const [face, setFace] = useState(0);
  const [rolling, setRolling] = useState(false);
  const hop = useSharedValue(0);
  const orbit = useSharedValue(0);

  // The face changes on the JS side (AnimatedDice tumbles while `rolling`).
  useEffect(() => {
    if (!motionEnabled) return;
    let land: ReturnType<typeof setTimeout> | undefined;
    const roll = () => {
      setRolling(true);
      land = setTimeout(() => {
        setFace((f) => (f + 1) % FACES.length);
        setRolling(false);
      }, TUMBLE_MS);
    };
    roll();
    const every = setInterval(roll, ROLL_MS);
    return () => {
      clearInterval(every);
      if (land) clearTimeout(land);
    };
  }, [motionEnabled]);

  // The leap and the coins' lap run on the UI thread, in step with the roll.
  useEffect(() => {
    cancelAnimation(hop);
    cancelAnimation(orbit);
    hop.set(0);
    orbit.set(0);
    if (!motionEnabled) return;
    hop.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: TUMBLE_MS * 0.45, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: TUMBLE_MS * 0.55, easing: Easing.bounce }),
          withTiming(0, { duration: ROLL_MS - TUMBLE_MS }),
        ),
        -1,
      ),
    );
    orbit.set(withRepeat(withTiming(1, { duration: ROLL_MS * 2, easing: Easing.linear }), -1));
    return () => {
      cancelAnimation(hop);
      cancelAnimation(orbit);
    };
  }, [motionEnabled, hop, orbit]);

  const die = Math.round(size * 0.34);
  const leap = size * 0.16;
  const dieStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -hop.get() * leap }, { rotate: `${hop.get() * -12}deg` }],
  }));

  const yard = size * 0.37;
  const inset = size * 0.045;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.14,
        backgroundColor: day ? '#ffffff' : '#1a1f2f',
        borderWidth: 1,
        borderColor: ui.line,
        boxShadow: `0 ${size * 0.08}px ${size * 0.2}px ${day ? ui.shadow : '#00000070'}`,
      }}
    >
      {YARDS.map((color, k) => (
        <View
          key={color}
          style={{
            position: 'absolute',
            left: k % 3 === 0 ? inset : size - inset - yard,
            top: k < 2 ? inset : size - inset - yard,
            width: yard,
            height: yard,
            borderRadius: yard * 0.24,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: yard * 0.56,
              height: yard * 0.56,
              borderRadius: yard,
              backgroundColor: day ? '#ffffffd9' : '#ffffffcc',
            }}
          />
        </View>
      ))}
      {YARDS.map((color, i) => (
        <OrbitCoin key={color} color={color} index={i} size={size} orbit={orbit} />
      ))}
      <Animated.View
        style={[
          { position: 'absolute', left: size / 2 - die / 2, top: size / 2 - die / 2 },
          dieStyle,
        ]}
      >
        <AnimatedDice
          value={FACES[face] ?? 6}
          finish="ivory"
          rolling={rolling}
          ready={false}
          motionEnabled={motionEnabled}
          size={die}
        />
      </Animated.View>
    </View>
  );
}

/** A coin lapping the board, a quarter lap behind the one before it. */
function OrbitCoin({
  color,
  index,
  size,
  orbit,
}: {
  color: string;
  index: number;
  size: number;
  orbit: { get(): number };
}) {
  const coin = size * 0.1;
  const radius = size * 0.31;
  const style = useAnimatedStyle(() => {
    const angle = (orbit.get() + index / 4) * Math.PI * 2 - Math.PI / 2;
    // A small hop as each coin crosses a lane (four times a lap).
    const lift = Math.abs(Math.sin(angle * 2)) * coin * 0.35;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius - lift },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: size / 2 - coin / 2,
          top: size / 2 - coin / 2,
          width: coin,
          height: coin,
          borderRadius: coin,
          backgroundColor: color,
          borderWidth: Math.max(1.5, coin * 0.16),
          borderColor: '#ffffff',
          boxShadow: '0 2px 4px #00000055',
        },
        style,
      ]}
    />
  );
}

/**
 * The small loader, for lists, buttons and panels: a four-colour mini board
 * that flips a quarter turn at a time with a springy overshoot. With the
 * phone's "reduce motion" on, it gently breathes instead of turning.
 */
export function LudoSpinner({ size = 28, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    // Four quarter turns, a beat apart; after the fourth (a full turn) it
    // starts again from 0, which looks exactly the same.
    const flip = (to: number) =>
      withDelay(
        160,
        withTiming(to, {
          duration: 440,
          easing: Easing.out(Easing.back(2)),
          reduceMotion: ReduceMotion.System,
        }),
      );
    turn.set(0);
    turn.set(withRepeat(withSequence(flip(1), flip(2), flip(3), flip(4)), -1));
    return () => cancelAnimation(turn);
  }, [turn]);
  const spin = useAnimatedStyle(() => {
    const t = turn.get() - Math.floor(turn.get());
    return {
      transform: [{ rotate: `${turn.get() * 90}deg` }, { scale: 1 - Math.sin(t * Math.PI) * 0.14 }],
    };
  });
  const tile = size * 0.44;
  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[{ width: size, height: size, alignSelf: 'center' }, style, spin]}
    >
      {YARDS.map((color, k) => (
        <View
          key={color}
          style={{
            position: 'absolute',
            left: k % 3 === 0 ? 0 : size - tile,
            top: k < 2 ? 0 : size - tile,
            width: tile,
            height: tile,
            borderRadius: tile * 0.3,
            backgroundColor: color,
          }}
        />
      ))}
    </Animated.View>
  );
}
