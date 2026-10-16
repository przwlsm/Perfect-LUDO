import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

interface BoardProps {
  readonly called: ReadonlySet<number>;
  readonly current: number | null;
}

const COLS = 10;
const GAP = 4;

/** The caller's 1–90 board: every called number lit, the newest one glowing. */
export const Board = memo(function Board({ called, current }: BoardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - GAP * (COLS - 1)) / COLS : 0;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={t('caller.boardA11y', { count: called.size })}
      style={styles.board}
    >
      {cell > 0 &&
        Array.from({ length: 9 }, (_, r) => (
          <View key={r} style={[styles.row, { gap: GAP }]}>
            {Array.from({ length: COLS }, (_, c) => {
              const n = r * COLS + c + 1;
              const lit = called.has(n);
              return (
                <View
                  key={n}
                  style={[
                    styles.cell,
                    {
                      width: cell,
                      height: cell * 0.86,
                      backgroundColor: lit ? theme.boardLit : theme.boardIdle,
                    },
                  ]}
                >
                  {n === current && <Glow color={theme.second} />}
                  <Text
                    allowFontScaling={false}
                    style={[
                      styles.n,
                      {
                        color: lit ? theme.boardLitText : theme.boardIdleText,
                        fontSize: Math.min(18, cell * 0.42),
                        fontFamily: lit ? FONTS.displayBold : FONTS.display,
                      },
                    ]}
                  >
                    {n}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
    </View>
  );
});

/** A ring that pulses around the newest number (still under calmer motion). */
function Glow({ color }: { color: string }) {
  const { calmMotion } = useSettings();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (calmMotion) return;
    pulse.set(
      withRepeat(
        withSequence(withTiming(0.35, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
      ),
    );
  }, [calmMotion, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.glow,
        { borderColor: color, boxShadow: `0 0 10px ${color}` },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  board: { gap: GAP },
  row: { flexDirection: 'row' },
  cell: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  n: { includeFontPadding: false },
  glow: { borderRadius: 8, borderWidth: 3 },
});
