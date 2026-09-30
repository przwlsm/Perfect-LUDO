import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { DieValue } from '@/domain';
import { Dice } from './Dice';

/**
 * A rolled die settles perfectly face-on: the number is what matters, and
 * this cube only renders cleanly fully angled or fully flat — anything in
 * between shows the side faces as detached slivers.
 */
const REST_TILT = 0;
export function AnimatedDice({
  value,
  finish,
  rolling,
  ready,
  motionEnabled,
  size = 56,
}: {
  value: DieValue | null;
  finish: string;
  rolling: boolean;
  ready: boolean;
  motionEnabled: boolean;
  size?: number;
}) {
  const spin = useSharedValue(0),
    lift = useSharedValue(0);
  const tilt = useSharedValue(value === null ? 1 : REST_TILT);
  useEffect(() => {
    cancelAnimation(spin);
    cancelAnimation(lift);
    cancelAnimation(tilt);
    if (!motionEnabled) {
      spin.value = 0;
      tilt.value = value === null ? 1 : REST_TILT;
      lift.value = 0;
      return;
    }
    tilt.value = withTiming(rolling || value === null ? 1 : REST_TILT, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
    if (rolling) {
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(Math.PI * 2, { duration: 480, easing: Easing.linear }),
        -1,
      );
      lift.value = withRepeat(
        withTiming(-5, { duration: 160, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      spin.value = withTiming(Math.ceil(spin.value / (Math.PI * 2)) * Math.PI * 2, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
      lift.value = ready
        ? withRepeat(withTiming(-2, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true)
        : withTiming(0, { duration: 180 });
    }
    return () => {
      cancelAnimation(spin);
      cancelAnimation(lift);
    };
  }, [rolling, ready, motionEnabled, spin, lift, tilt, value]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  return (
    <Animated.View
      accessible
      accessibilityLabel={
        rolling ? 'Dice rolling' : value ? `Dice showing ${value}` : 'Ready to roll'
      }
      style={style}
    >
      <Dice value={value} finish={finish} size={size} spin={spin} tilt={tilt} />
    </Animated.View>
  );
}
