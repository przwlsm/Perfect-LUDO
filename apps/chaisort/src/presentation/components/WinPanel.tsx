import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { Chaiwala } from './Chaiwala';
import { AppText, Button } from './Kit';

interface WinPanelProps {
  readonly title: string;
  readonly cheer: string;
  readonly stars: 1 | 2 | 3;
  readonly pours: number;
  readonly par: number;
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
}

/** The card that rises once the order is served: the chaiwala, stars, numbers, and what next. */
export function WinPanel(p: WinPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { sounds, haptics, calmMotion } = useSettings();

  useEffect(() => {
    const timers = Array.from({ length: p.stars }, (_, i) =>
      setTimeout(
        () => {
          sounds.play('star');
          haptics.tick();
        },
        300 + i * 230,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [p.stars, sounds, haptics]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn.duration(400)}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor:
              theme.scheme === 'evening' ? 'rgba(10, 5, 2, 0.35)' : 'rgba(90, 40, 10, 0.1)',
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        entering={calmMotion ? FadeIn.duration(250) : SlideInDown.springify().damping(17)}
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 14) + 8,
            boxShadow: `0 -12px 40px ${theme.shadow}`,
          },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.head}>
          <Chaiwala size={56} mood="cheer" />
          <View style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {p.title}
            </AppText>
            <AppText variant="body" color={theme.muted}>
              “{p.cheer}”
            </AppText>
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
                  : ZoomIn.delay(300 + i * 230)
                      .springify()
                      .damping(9)
              }
            >
              <Ionicons
                name={i < p.stars ? 'star' : 'star-outline'}
                size={i === 1 ? 40 : 32}
                color={i < p.stars ? theme.accent : theme.faint}
                style={i === 1 ? styles.midStar : undefined}
              />
            </Animated.View>
          ))}
        </View>
        <View style={styles.stats}>
          <Stat label={t('win.pours')} value={String(p.pours)} />
          <Stat label={t('win.par')} value={String(p.par)} />
          <Stat label={t('win.hints')} value={p.hints === 0 ? t('win.noHints') : String(p.hints)} />
        </View>
        {p.streak !== null && p.streak > 0 && (
          <AppText variant="heading" center color={theme.accentText}>
            🔥 {t('win.streak', { count: p.streak })}
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
          <Button
            kind="secondary"
            compact
            icon="grid-outline"
            label={p.levelsLabel}
            onPress={p.onLevels}
            style={styles.flex}
          />
        </View>
        {p.onShareImage && (
          <Button
            kind="ghost"
            compact
            icon="image-outline"
            label={t('win.shareImage')}
            onPress={p.onShareImage}
          />
        )}
      </Animated.View>
    </View>
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
    paddingTop: 18,
    gap: 10,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stars: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 10 },
  midStar: { marginBottom: 6 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
