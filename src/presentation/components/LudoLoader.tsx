import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { DieValue } from '@/domain';
import { AnimatedDice } from './AnimatedDice';
import { Text } from './AppText';
import { ui } from '../theme/themes';

const COIN_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];
const FACES: readonly DieValue[] = [6, 3, 5, 1, 4, 2];

/** Little Ludo tips to read while the table is being set. */
export const LOADING_TIPS: readonly string[] = [
  'A six brings a coin out of home.',
  'Roll a six and you roll again.',
  'Star squares are safe: nobody can capture you there.',
  'Two coins on one square make a block no rival can land on.',
  'Capturing a coin earns you a bonus roll.',
  'Three sixes in a row and your turn is over.',
  'You need an exact roll to reach home.',
  'Online wins pay the most coins and XP.',
  'Spin the lucky wheel every day for free rewards.',
  'In Kill & Go, capture first, then head home.',
];

/**
 * The Ludo-themed loading state: a die rolling through its faces, four
 * coins hopping in turn, and a rotating tip. Holds still (showing a six)
 * when motion is off.
 */
export function LudoLoader({
  motionEnabled,
  label = 'Setting up the board…',
}: {
  motionEnabled: boolean;
  label?: string;
}) {
  const [face, setFace] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    if (!motionEnabled) return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const roll = setInterval(() => {
      setRolling(true);
      settle = setTimeout(() => {
        setFace((f) => (f + 1) % FACES.length);
        setRolling(false);
      }, 650);
    }, 1500);
    return () => {
      clearInterval(roll);
      if (settle) clearTimeout(settle);
    };
  }, [motionEnabled]);

  useEffect(() => {
    const next = setInterval(() => setTip((t) => (t + 1) % LOADING_TIPS.length), 2800);
    return () => clearInterval(next);
  }, []);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label} ${LOADING_TIPS[tip]}`}
      style={s.wrap}
    >
      <View style={s.table}>
        <AnimatedDice
          value={FACES[face] ?? 6}
          finish="ivory"
          rolling={rolling}
          ready={false}
          motionEnabled={motionEnabled}
          size={64}
        />
      </View>
      <View style={s.coins}>
        {COIN_COLORS.map((color, i) => (
          <HoppingCoin key={color} color={color} index={i} active={motionEnabled} />
        ))}
      </View>
      <Text style={s.label}>{label}</Text>
      <Animated.View
        key={tip}
        entering={motionEnabled ? FadeIn.duration(300) : undefined}
        exiting={motionEnabled ? FadeOut.duration(200) : undefined}
        style={s.tipBox}
      >
        <Text style={s.tipTitle}>LUDO TIP</Text>
        <Text style={s.tip}>{LOADING_TIPS[tip]}</Text>
      </Animated.View>
    </View>
  );
}

function HoppingCoin({ color, index, active }: { color: string; index: number; active: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    if (active)
      t.value = withDelay(
        index * 180,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 460 }),
          ),
          -1,
        ),
      );
    return () => cancelAnimation(t);
  }, [active, index, t]);
  const hop = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -14]) },
      { scale: interpolate(t.value, [0, 1], [1, 1.08]) },
    ],
  }));
  return (
    <Animated.View style={[s.coin, { backgroundColor: color }, hop]}>
      <View style={s.coinShine} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 28 },
  table: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: '#1a1f2f',
    borderWidth: 1,
    borderColor: '#ffffff14',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 30px #00000070',
  },
  coins: { flexDirection: 'row', gap: 12, height: 34, alignItems: 'flex-end' },
  coin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#ffffffdd',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 6px #00000060',
  },
  coinShine: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ffffff90' },
  label: { color: ui.text, fontSize: 17, fontWeight: '800' },
  tipBox: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#ffffff08',
    maxWidth: 320,
  },
  tipTitle: { color: ui.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  tip: { color: ui.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
