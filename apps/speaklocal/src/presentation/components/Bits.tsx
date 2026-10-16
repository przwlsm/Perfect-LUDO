import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { LangId, Phrase } from '@/domain/content/types';
import { familyFor } from '../fonts';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

/** Text in a language's own script, in its Baloo face, with room for tall marks. */
export function NativeText({
  lang,
  children,
  size,
  color,
  style,
  center,
  numberOfLines,
}: {
  lang: LangId;
  children: string;
  size: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  center?: boolean;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.4}
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: familyFor(lang),
          fontSize: size,
          lineHeight: Math.round(size * 1.55),
          color: color ?? theme.text,
        },
        center && styles.center,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** A Hindi meaning line, in Devanagari. */
export function HindiText({
  children,
  color,
  size = 15,
  center,
}: {
  children: string;
  color?: string;
  size?: number;
  center?: boolean;
}) {
  const theme = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        {
          fontFamily: familyFor('hi'),
          fontSize: size,
          lineHeight: Math.round(size * 1.5),
          color: color ?? theme.muted,
        },
        center && styles.center,
      ]}
    >
      {children}
    </Text>
  );
}

interface PhraseTextProps {
  readonly phrase: Phrase;
  /** Native text size; the rest follows. */
  readonly size?: number;
  readonly color?: string;
  readonly subColor?: string;
  readonly center?: boolean;
  /** Show the romanisation bigger (no voice on this device). */
  readonly bigRoman?: boolean;
  readonly hideMeaning?: boolean;
}

/** Native script, romanisation, meaning (and the Hindi meaning when asked for). */
export function PhraseText({
  phrase,
  size = 24,
  color,
  subColor,
  center,
  bigRoman,
  hideMeaning,
}: PhraseTextProps) {
  const theme = useTheme();
  const { settings } = useSettings();
  const romanSize = Math.round(size * (bigRoman ? 0.9 : 0.66));
  return (
    <View style={styles.phrase}>
      <NativeText lang={phrase.lang} size={size} color={color} center={center}>
        {phrase.native}
      </NativeText>
      <Text
        maxFontSizeMultiplier={1.6}
        style={[
          {
            fontFamily: FONTS.bodyHeavy,
            fontSize: romanSize,
            lineHeight: Math.round(romanSize * 1.3),
            color: color ?? theme.text,
            letterSpacing: 0.2,
          },
          center && styles.center,
        ]}
      >
        {phrase.roman}
      </Text>
      {!hideMeaning && (
        <Text
          maxFontSizeMultiplier={1.6}
          style={[styles.meaning, { color: subColor ?? theme.muted }, center && styles.center]}
        >
          {phrase.en}
        </Text>
      )}
      {!hideMeaning && settings.hindiMeanings && phrase.lang !== 'hi' && (
        <HindiText color={subColor} center={center}>
          {phrase.hi}
        </HindiText>
      )}
    </View>
  );
}

/** A small culture note under a line. */
export function Note({
  text,
  color,
  style,
}: {
  text: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: theme.surfaceRaised }, style]}>
      <Ionicons
        name="bulb-outline"
        size={15}
        color={color ?? theme.accentText}
        style={styles.noteIcon}
      />
      <Text maxFontSizeMultiplier={1.6} style={[styles.noteText, { color: theme.text }]}>
        {text}
      </Text>
    </View>
  );
}

/** "This phone has no Kannada voice yet": gentle, with what to do about it. */
export function NoVoiceNote({ lang, compact }: { lang: LangId; compact?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[styles.noVoice, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="volume-mute-outline" size={20} color={theme.accentText} />
      <Text maxFontSizeMultiplier={1.6} style={[styles.noVoiceText, { color: theme.text }]}>
        {compact
          ? t('voice.noneShort', { language: t(`languages.${lang}`) })
          : t('voice.none', { language: t(`languages.${lang}`) })}
      </Text>
    </View>
  );
}

/** A thin ring that fills clockwise with progress (0–1). */
export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  color,
  track,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
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
        color={track ?? theme.track}
      />
      <Path
        path={arc}
        style="stroke"
        strokeWidth={stroke}
        strokeCap="round"
        color={color ?? theme.teal}
      />
    </Canvas>
  );
}

/** Three small marks: heard it, said it, passed its quiz. */
const MARKS = [
  ['ear', 'ear-outline'],
  ['mic', 'mic-outline'],
  ['checkmark-circle', 'checkmark-circle-outline'],
] as const;
export function SceneDots({
  count,
  color,
  todo,
}: {
  count: number;
  color?: string;
  todo?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.dots} accessible={false}>
      {MARKS.map(([done, todo], i) => (
        <Ionicons
          key={done}
          name={i < count ? done : todo}
          size={15}
          color={i < count ? (color ?? theme.accentText) : (todo ?? theme.faint)}
          style={i < count ? undefined : styles.dim}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  phrase: { gap: 2 },
  meaning: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 21 },
  note: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  noteIcon: { marginTop: 2 },
  noteText: { flex: 1, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 },
  noVoice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  noVoiceText: { flex: 1, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 5 },
  dim: { opacity: 0.55 },
});
