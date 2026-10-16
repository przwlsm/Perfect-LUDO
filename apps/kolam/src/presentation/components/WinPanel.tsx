import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { clock } from '@/application/game/play';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, Button, IconButton, Pressy } from './Kit';

interface WinPanelProps {
  readonly title: string;
  readonly stars: 1 | 2 | 3;
  readonly size: string;
  readonly seconds: number | null;
  readonly hints: number;
  readonly streak: number | null;
  readonly last: boolean;
  readonly onNext?: () => void;
  readonly onShareText?: () => void;
  /** Absent where pictures cannot be shared (a browser). */
  readonly onShareImage?: () => void;
  readonly onReplay: () => void;
  readonly onLevels: () => void;
  readonly levelsLabel: string;
  /** Reports the card's height, so the board can rise above it. */
  readonly onHeight: (height: number) => void;
}

/**
 * The card that rises once the kolam has bloomed: stars, a few numbers and
 * what next. It folds down to a slim bar to let the player look at the kolam.
 */
export function WinPanel(p: WinPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { sounds, haptics, calmMotion } = useSettings();
  const [folded, setFolded] = useState(false);

  useEffect(() => {
    const timers = Array.from({ length: p.stars }, (_, i) =>
      setTimeout(
        () => {
          sounds.play('segment');
          haptics.tick();
        },
        280 + i * 230,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [p.stars, sounds, haptics]);

  return (
    <Animated.View
      entering={calmMotion ? FadeIn.duration(250) : SlideInDown.springify().damping(18)}
      onLayout={(e) => p.onHeight(e.nativeEvent.layout.height)}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 14) + 8,
          boxShadow: `0 -12px 40px ${theme.shadow}`,
        },
      ]}
    >
      {folded ? (
        <Pressy
          onPress={() => setFolded(false)}
          accessibilityLabel={p.title}
          style={styles.foldedRow}
        >
          <View style={styles.miniStars}>
            {[0, 1, 2].map((i) => (
              <Ionicons
                key={i}
                name={i < p.stars ? 'star' : 'star-outline'}
                size={18}
                color={i < p.stars ? theme.accent : theme.faint}
              />
            ))}
          </View>
          <AppText variant="heading" style={styles.flex} numberOfLines={1}>
            {p.title}
          </AppText>
          <Ionicons name="chevron-up" size={22} color={theme.text} />
        </Pressy>
      ) : (
        <>
          <View style={styles.head}>
            <View style={styles.headSide} />
            <AppText variant="title" center accessibilityRole="header" style={styles.flex}>
              {p.title}
            </AppText>
            <View style={styles.headSide}>
              <IconButton
                icon="chevron-down"
                label={t('win.fold')}
                size={44}
                glass={false}
                onPress={() => setFolded(true)}
              />
            </View>
          </View>
          <View
            style={styles.stars}
            accessible
            accessibilityLabel={t('win.starsA11y', { count: p.stars })}
          >
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                entering={
                  calmMotion
                    ? undefined
                    : ZoomIn.delay(280 + i * 230)
                        .springify()
                        .damping(9)
                }
              >
                <Ionicons
                  name={i < p.stars ? 'star' : 'star-outline'}
                  size={i === 1 ? 46 : 38}
                  color={i < p.stars ? theme.accent : theme.faint}
                  style={i === 1 ? styles.midStar : undefined}
                />
              </Animated.View>
            ))}
          </View>
          <View style={styles.stats}>
            <Stat label={t('win.size')} value={p.size} />
            {p.seconds !== null && <Stat label={t('win.time')} value={clock(p.seconds)} />}
            <Stat
              label={t('win.hints')}
              value={p.hints === 0 ? t('win.noHints') : String(p.hints)}
            />
          </View>
          {p.streak !== null && p.streak > 0 && (
            <AppText variant="heading" center color={theme.accentText}>
              ✿ {t('win.streak', { count: p.streak })}
            </AppText>
          )}
          {p.last && (
            <AppText variant="body" center color={theme.muted}>
              {t('win.lastLevel')}
            </AppText>
          )}
          {p.onNext && <Button icon="arrow-forward" label={t('win.next')} onPress={p.onNext} />}
          {p.onShareText && (
            <Button icon="share-social" label={t('win.share')} onPress={p.onShareText} />
          )}
          <View style={styles.row}>
            <Button
              kind="secondary"
              compact
              icon="refresh"
              label={t('win.replay')}
              onPress={p.onReplay}
              style={styles.flex}
            />
            {p.onShareImage && (
              <Button
                kind="secondary"
                compact
                icon="image-outline"
                label={t('win.shareImage')}
                onPress={p.onShareImage}
                style={styles.flex}
              />
            )}
          </View>
          <Button
            kind="ghost"
            compact
            icon="grid-outline"
            label={p.levelsLabel}
            onPress={p.onLevels}
          />
        </>
      )}
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.stat, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
    >
      <AppText variant="label">{label}</AppText>
      <AppText variant="heading">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 12,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  headSide: { width: 44, alignItems: 'flex-end' },
  foldedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  miniStars: { flexDirection: 'row', gap: 2 },
  stars: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10 },
  midStar: { marginBottom: 6 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
