import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { PlayerColor } from '@/domain';
import { PLAYER_COLOR_HEX } from './PlayerColorPalette';

export interface PieceTokenProps {
  readonly color: PlayerColor;
  readonly isTappable: boolean;
  readonly size?: number;
  readonly fill?: string;
  readonly label?: string;
  readonly motionEnabled?: boolean;
  readonly hitSize?: number;
  onPress?(): void;
}

export function PieceToken({
  color,
  isTappable,
  size = 24,
  fill,
  label,
  motionEnabled = false,
  hitSize = size,
  onPress,
}: PieceTokenProps): React.JSX.Element {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = 0;
    if (isTappable && motionEnabled)
      pulse.value = withRepeat(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    return () => cancelAnimation(pulse);
  }, [isTappable, motionEnabled, pulse]);
  const lift = useAnimatedStyle(() => ({
    transform: [{ translateY: -pulse.value * size * 0.13 }, { scale: 1 + pulse.value * 0.1 }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: 0.7 - pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.3 }],
  }));
  return (
    <Pressable
      disabled={!isTappable}
      onPress={onPress}
      accessibilityRole={isTappable ? 'button' : undefined}
      accessibilityHint={isTappable ? 'Move this piece using the rolled dice value' : undefined}
      accessibilityLabel={`${label ?? `${color} piece`}${isTappable ? ', tap to move' : ''}`}
      style={{ width: hitSize, height: hitSize, alignItems: 'center', justifyContent: 'center' }}
    >
      {isTappable && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: size + 10,
              height: size + 10,
              borderRadius: size,
              borderColor: fill ?? PLAYER_COLOR_HEX[color],
              backgroundColor: `${fill ?? PLAYER_COLOR_HEX[color]}20`,
            },
            halo,
          ]}
        />
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.token,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill ?? PLAYER_COLOR_HEX[color],
            boxShadow: isTappable ? '0 0 9px #ffffff' : '0 2px 2px #00000040',
          },
          isTappable && styles.tappable,
          lift,
        ]}
      >
        <View
          style={{
            width: '58%',
            height: '58%',
            borderWidth: 2,
            borderColor: '#ffffffaa',
            borderRadius: size,
          }}
        />
        <View style={[styles.highlight, { borderRadius: size / 2 }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', borderWidth: 2 },
  token: {
    borderWidth: 2,
    borderColor: '#ffffffcc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tappable: {
    borderColor: '#f8fafc',
    borderWidth: 3,
  },
  highlight: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    width: '30%',
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
