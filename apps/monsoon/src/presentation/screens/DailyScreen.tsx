import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { dateOfDaily, shareText, todayNumber } from '@/application/levels/daily';
import { textSharer } from '@/config/container';
import { AppText, Button, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useRecord } from '../state/RecordProvider';
import { useTheme } from '../theme/ThemeProvider';

const GAP = 8;

/** Time until the next UTC midnight, when everyone's new hillside arrives. */
function untilNext(now: number): string {
  const next = Math.ceil(now / 86_400_000) * 86_400_000;
  const mins = Math.max(1, Math.round((next - now) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} h ${mins % 60} min` : `${mins} min`;
}

export function DailyScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const rec = useRecord();
  const ent = useEntitlements();
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const today = todayNumber(new Date(now));
  const result = rec.record.dailies[today];
  const size = Math.floor((Math.min(width, 640) - 32 - 36 - GAP * 4) / 5);
  const days = Array.from({ length: today }, (_, i) => today - i);
  const date = dateOfDaily(today).toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
  const hintsText = (h: number) => (h === 0 ? t('win.noHints') : t('win.hintCount', { count: h }));

  const share = async () => {
    if (!result) return;
    const text = shareText(
      today,
      { paddies: result.paddies, ponds: result.ponds },
      result.turns,
      result.hints,
      {
        name: t('app.name'),
        turns: (k) => t('win.turnCount', { count: k }),
        noHints: t('win.noHints'),
        hints: (k) => t('win.hintCount', { count: k }),
      },
    );
    const outcome = await textSharer.shareText(text);
    if (outcome === 'copied') setNote(t('win.copied'));
  };

  return (
    <Page title={t('daily.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('daily.lead')}
      </AppText>
      <View
        style={[
          styles.today,
          { borderColor: theme.border, boxShadow: `0 14px 36px ${theme.shadow}` },
        ]}
      >
        <LinearGradient
          colors={theme.scheme === 'dusk' ? ['#1d4250', theme.surface] : ['#d3ebf5', theme.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AppText variant="label" color={theme.water}>
          {date}
        </AppText>
        <AppText variant="display">{t('home.dailyNumber', { n: today })}</AppText>
        {result ? (
          <View style={styles.solvedRow}>
            <Ionicons name="checkmark-circle" size={22} color={theme.good} />
            <AppText variant="heading" style={styles.flex}>
              {t('daily.solved', {
                turns: t('win.turnCount', { count: result.turns }),
                hints: hintsText(result.hints),
              })}
            </AppText>
          </View>
        ) : null}
        <AppText variant="caption">{t('daily.harder')}</AppText>
        <View style={styles.row}>
          <Button
            icon={result ? 'refresh' : 'play'}
            label={result ? t('daily.replay') : t('daily.play')}
            kind={result ? 'secondary' : 'primary'}
            onPress={() => router.push({ pathname: '/play/[id]', params: { id: `d${today}` } })}
            style={styles.flex}
          />
          {result && (
            <Button
              icon="share-social"
              label={t('win.share')}
              onPress={() => void share()}
              style={styles.flex}
            />
          )}
        </View>
        {note && (
          <AppText variant="caption" center accessibilityLiveRegion="polite">
            {note}
          </AppText>
        )}
        <View style={styles.meta}>
          <AppText variant="caption" color={theme.water}>
            {rec.streak > 0 ? `🌧️ ${t('daily.streak', { count: rec.streak })}` : t('home.noStreak')}
          </AppText>
          <AppText variant="caption">{t('daily.next', { time: untilNext(now) })}</AppText>
        </View>
      </View>

      <Card style={styles.archive}>
        <AppText variant="title">{t('daily.archive')}</AppText>
        <AppText variant="caption">
          {ent.plus ? t('daily.archivePlus') : t('daily.archiveFree')}
        </AppText>
        <View style={styles.grid}>
          {days.map((n) => {
            const open = ent.archiveOpen(n, today);
            const done = !!rec.record.dailies[n];
            const state = done
              ? t('daily.solvedState')
              : open
                ? t('daily.openState')
                : t('daily.lockedState');
            return (
              <Pressable
                key={n}
                onPress={() =>
                  open
                    ? router.push({ pathname: '/play/[id]', params: { id: `d${n}` } })
                    : router.push('/support')
                }
                accessibilityRole="button"
                accessibilityLabel={t('daily.dayA11y', { n, state })}
                style={({ pressed }) => [
                  styles.day,
                  {
                    width: size,
                    height: size,
                    backgroundColor:
                      n === today ? theme.accent : done ? theme.surfaceRaised : 'transparent',
                    borderColor: n === today ? 'transparent' : theme.border,
                    opacity: open ? 1 : 0.55,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <AppText variant="caption" color={n === today ? theme.onAccent : theme.muted}>
                  #{n}
                </AppText>
                <Ionicons
                  name={!open ? 'lock-closed' : done ? 'leaf' : 'ellipse-outline'}
                  size={16}
                  color={n === today ? theme.onAccent : done ? theme.good : theme.faint}
                />
              </Pressable>
            );
          })}
        </View>
        {!ent.plus && today > 7 && (
          <Button
            kind="secondary"
            icon="sparkles"
            label={t('daily.plusCta')}
            onPress={() => router.push('/support')}
          />
        )}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  today: { borderRadius: 28, borderWidth: 1, padding: 20, gap: 10, overflow: 'hidden' },
  solvedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1 },
  archive: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  day: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
});
