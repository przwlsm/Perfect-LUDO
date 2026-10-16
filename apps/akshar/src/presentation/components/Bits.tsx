import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import type { Script, ScriptId } from '@/domain/entities/Script';
import { scriptFamily } from '../glyph/fonts';
import { useTheme } from '../theme/ThemeProvider';

/** A familiar letter to stand for each script on its card. */
export const SAMPLE: Readonly<Record<ScriptId, string>> = {
  devanagari: 'क',
  tamil: 'க',
  kannada: 'ಕ',
  telugu: 'క',
  bengali: 'ক',
  gujarati: 'ક',
  gurmukhi: 'ਕ',
  malayalam: 'ക',
  urdu: 'ج',
};

/** Three little stars, filled up to `count`. */
export function Stars({
  count,
  size = 14,
  gap = 2,
}: {
  count: number;
  size?: number;
  gap?: number;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.stars, { gap }]} accessible={false}>
      {[0, 1, 2].map((i) => (
        <Ionicons
          key={i}
          name={i < count ? 'star' : 'star-outline'}
          size={size}
          color={i < count ? theme.star : theme.starEmpty}
        />
      ))}
    </View>
  );
}

/** A thin ring that fills clockwise with progress (0–1), drawn with Skia. */
export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  color,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const arc = useMemo(() => {
    const v = Math.max(0, Math.min(1, value));
    const b = Skia.PathBuilder.Make();
    if (v > 0) {
      b.addArc(
        Skia.XYWHRect(stroke / 2, stroke / 2, size - stroke, size - stroke),
        -90,
        360 * Math.max(v, 0.02),
      );
    }
    return b.build();
  }, [value, size, stroke]);
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        style="stroke"
        strokeWidth={stroke}
        color={theme.starEmpty}
      />
      <Path
        path={arc}
        style="stroke"
        strokeWidth={stroke}
        strokeCap="round"
        color={color ?? theme.star}
      />
    </Canvas>
  );
}

/** A letter (or word) in its script's Baloo face, sized in dp and immune to font scaling. */
export function ScriptText({
  script,
  children,
  size,
  color,
  style,
}: {
  script: Script;
  children: string;
  size: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          fontFamily: scriptFamily(script.font),
          fontSize: size,
          lineHeight: Math.round(size * 1.5),
          color: color ?? theme.text,
          writingDirection: script.rtl ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row' },
});
