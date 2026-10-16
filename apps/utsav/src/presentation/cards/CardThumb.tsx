import { useEffect } from 'react';
import { Image, PixelRatio, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { CardSpec } from '@/domain/entities/Card';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useCardThumb } from './render';

interface Props {
  readonly spec: CardSpec | null;
  readonly width: number;
  readonly radius?: number;
  readonly urgent?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * A finished card as a still picture, for galleries. It is drawn once in
 * the background and cached; a soft placeholder holds its place meanwhile.
 */
export function CardThumb({ spec, width, radius = 18, urgent, style }: Props) {
  const theme = useTheme();
  const { plus } = useEntitlements();
  const height = spec?.format === 'story' ? (width * 1920) / 1080 : width;
  const uri = useCardThumb(spec, width * Math.min(PixelRatio.get(), 2.5), { plus, urgent });
  const shown = useSharedValue(uri ? 1 : 0);
  useEffect(() => {
    shown.set(withTiming(uri ? 1 : 0, { duration: 260 }));
  }, [uri, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.get() }));
  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.shimmer,
          boxShadow: `0 8px 22px ${theme.shadow}`,
        },
        style,
      ]}
    >
      {uri && (
        <Animated.View style={[StyleSheet.absoluteFill, fade]}>
          <Image
            source={{ uri }}
            style={{ width, height, borderRadius: radius }}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
