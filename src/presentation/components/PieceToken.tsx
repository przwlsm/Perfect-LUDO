import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { PlayerColor } from '@/domain';
import { PLAYER_COLOR_HEX } from './PlayerColorPalette';

const WAVE_MS = 1500;

/**
 * One ripple radiating out from a playable coin. Two of these run half a
 * cycle apart so the coin reads as continuously pulsing rather than
 * blinking. Rendered only while motion is allowed — the static ring behind
 * it is what marks a coin as playable when motion is off.
 */
function WaveRing({ size, tint, delay }: { size: number; tint: string; delay: number }) {
  const wave = useSharedValue(0);
  useEffect(() => {
    wave.value = withRepeat(
      withDelay(delay, withTiming(1, { duration: WAVE_MS, easing: Easing.out(Easing.quad) })),
      -1,
      false,
    );
    return () => cancelAnimation(wave);
  }, [wave, delay]);
  const ripple = useAnimatedStyle(() => ({
    opacity: (1 - wave.value) * 0.5,
    transform: [{ scale: 0.6 + wave.value * 0.75 }],
  }));
  return (
    <Animated.View
      testID="coin-wave"
      pointerEvents="none"
      style={[
        styles.wave,
        { width: size * 1.6, height: size * 1.6, borderRadius: size, borderColor: tint },
        ripple,
      ]}
    />
  );
}

export interface PieceTokenProps {
  readonly color: PlayerColor;
  readonly isTappable: boolean;
  readonly size?: number;
  readonly fill?: string;
  readonly label?: string;
  readonly motionEnabled?: boolean;
  readonly hitSize?: number;
  readonly pieceStyle?: 'coin' | 'pawn';
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
  pieceStyle = 'coin',
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
    transform: [
      { translateY: -pulse.value * size * 0.22 },
      { rotateZ: `${pulse.value * 7}deg` },
      { scale: 1 + pulse.value * 0.06 },
    ],
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
        <>
          {motionEnabled && (
            <>
              <WaveRing size={size} tint="#fff8df" delay={0} />
              <WaveRing size={size} tint="#fff8df" delay={WAVE_MS / 2} />
            </>
          )}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size + 7,
              height: size + 7,
              borderRadius: size,
              borderWidth: 2,
              borderColor: '#fff8df',
              backgroundColor: (fill ?? PLAYER_COLOR_HEX[color]) + '40',
              boxShadow: '0 0 6px #fff8df90',
            }}
          />
        </>
      )}
      {pieceStyle === 'pawn' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { width: size, height: size * 1.25, alignItems: 'center', justifyContent: 'flex-end' },
            lift,
          ]}
        >
          <View
            style={{
              position: 'absolute',
              bottom: -1,
              width: size * 0.9,
              height: size * 0.28,
              borderRadius: size,
              backgroundColor: '#00000030',
              transform: [{ translateX: 2 }],
            }}
          />
          <View
            style={{
              width: size * 0.86,
              height: size * 0.25,
              borderRadius: size,
              backgroundColor: fill,
              borderWidth: 1.5,
              borderColor: isTappable ? '#ffffff' : '#ffffff80',
              borderBottomColor: '#00000065',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: size * 0.15,
              width: size * 0.55,
              height: size * 0.67,
              borderTopLeftRadius: size * 0.2,
              borderTopRightRadius: size * 0.2,
              borderBottomLeftRadius: size * 0.35,
              borderBottomRightRadius: size * 0.35,
              backgroundColor: fill,
              borderLeftWidth: 2,
              borderLeftColor: '#ffffff60',
              borderRightWidth: 2,
              borderRightColor: '#00000035',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              width: size * 0.58,
              height: size * 0.58,
              borderRadius: size,
              backgroundColor: fill,
              borderWidth: 1,
              borderColor: '#ffffff80',
              boxShadow: '1px 2px 2px #00000040',
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: '20%',
                top: '12%',
                width: '35%',
                height: '25%',
                backgroundColor: '#ffffff80',
                borderRadius: size,
              }}
            />
          </View>
        </Animated.View>
      ) : (
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
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wave: { position: 'absolute', borderWidth: 2 },
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
