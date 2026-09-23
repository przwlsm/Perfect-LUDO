import { useEffect, useState } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { DieValue } from '@/domain';
import { Dice } from './Dice';

export function AnimatedDice({
  value,
  finish,
  rolling,
  ready,
  motionEnabled,
}: {
  value: DieValue | null;
  finish: string;
  rolling: boolean;
  ready: boolean;
  motionEnabled: boolean;
}) {
  const [frame, setFrame] = useState<DieValue>(1);
  const tilt = useSharedValue(0);
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(tilt);
    cancelAnimation(lift);
    cancelAnimation(scale);
    if (!motionEnabled) {
      tilt.value = 0;
      lift.value = 0;
      scale.value = 1;
      return;
    }
    if (rolling) {
      tilt.value = withRepeat(
        withSequence(
          withTiming(-16, { duration: 80 }),
          withTiming(16, { duration: 160 }),
          withTiming(0, { duration: 80 }),
        ),
        -1,
      );
      lift.value = withRepeat(
        withTiming(-9, { duration: 160, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      scale.value = withTiming(1.1, { duration: 120 });
    } else {
      tilt.value = withSpring(0, { damping: 13, stiffness: 180 });
      scale.value = withSpring(1, { damping: 11, stiffness: 220 });
      lift.value = ready
        ? withRepeat(withTiming(-2, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true)
        : withSpring(0);
    }
    return () => {
      cancelAnimation(tilt);
      cancelAnimation(lift);
      cancelAnimation(scale);
    };
  }, [rolling, ready, motionEnabled, tilt, lift, scale]);
  useEffect(() => {
    if (!rolling || !motionEnabled) return;
    const timer = setInterval(() => setFrame((previous) => ((previous % 6) + 1) as DieValue), 70);
    return () => clearInterval(timer);
  }, [rolling, motionEnabled]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { rotate: `${tilt.value}deg` }, { scale: scale.value }],
  }));
  return (
    <Animated.View
      accessible
      accessibilityLabel={
        rolling ? 'Dice rolling' : value ? `Dice showing ${value}` : 'Ready to roll'
      }
      style={style}
    >
      <Dice value={rolling && motionEnabled ? frame : value} finish={finish} />
    </Animated.View>
  );
}
