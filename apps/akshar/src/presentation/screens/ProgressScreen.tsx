import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { achievements, recentDays } from '@/application/learning/learning';
import { tally, totalStars } from '@/domain/entities/Progress';
import { SCRIPTS } from '@/domain/entities/scripts';
import { ProgressRing, SAMPLE, ScriptText } from '../components/Bits';
import { AppText, Card, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const ICONS = {
  firstLetter: 'create-outline',
  tenLetters: 'documents-outline',
  fiftyLetters: 'library-outline',
  firstMemory: 'bulb-outline',
  vowels: 'musical-notes-outline',
  wholeScript: 'trophy-outline',
  twoScripts: 'language-outline',
  threeDays: 'sunny-outline',
  sevenDays: 'calendar-outline',
  hundredStars: 'star-outline',
} as const;

/** Gentle progress: totals, a calendar of writing days, per-script rings and milestones. */
export function ProgressScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { progress } = useProgress();
  const { settings } = useSettings();
  const now = useMemo(() => new Date(), []);
  const days = recentDays(progress, now, 28);
  const list = achievements(progress);
  const scripts = SCRIPTS.filter(
    (s) => settings.scripts.includes(s.id) || tally(progress, s).started > 0,
  );

  const stats = [
    {
      label: t('progress.letters'),
      value: Object.keys(progress.stars).length,
      icon: 'create-outline' as const,
    },
    { label: t('progress.stars'), value: totalStars(progress), icon: 'star' as const },
    { label: t('progress.days'), value: progress.days.length, icon: 'calendar-outline' as const },
    { label: t('progress.memory'), value: progress.fromMemory, icon: 'bulb-outline' as const },
  ];

  return (
    <Page title={t('progress.title')}>
      <AppText color={theme.muted}>
        {progress.written ? t('progress.lead') : t('progress.empty')}
      </AppText>

      <View style={styles.stats}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.stat}>
            <Ionicons
              name={s.icon}
              size={20}
              color={s.icon === 'star' ? theme.star : theme.accentText}
            />
            <AppText style={styles.statValue}>{s.value}</AppText>
            <AppText variant="caption" numberOfLines={1}>
              {s.label}
            </AppText>
          </Card>
        ))}
      </View>

      <Card style={styles.calendarCard}>
        <AppText variant="label">{t('progress.calendar')}</AppText>
        <View
          style={styles.calendar}
          accessible
          accessibilityLabel={t('progress.calendarA11y', { count: days.filter(Boolean).length })}
        >
          {days.map((on, i) => (
            <View
              key={i}
              style={[
                styles.day,
                {
                  backgroundColor: on ? theme.accent : theme.surfaceRaised,
                  borderColor: i === days.length - 1 ? theme.accentText : theme.border,
                },
              ]}
            />
          ))}
        </View>
      </Card>

      <AppText variant="label">{t('progress.scripts')}</AppText>
      <View style={styles.scripts}>
        {scripts.map((s) => {
          const tl = tally(progress, s);
          return (
            <Pressy
              key={s.id}
              onPress={() => router.push(`/script/${s.id}`)}
              accessibilityLabel={t('home.scriptA11y', {
                name: t(`scripts.${s.id}.name`),
                started: tl.started,
                total: tl.letters,
              })}
              style={[
                styles.scriptTile,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.ring}>
                <ProgressRing value={tl.stars / tl.maxStars} size={64} stroke={5} />
                <View style={styles.ringInner}>
                  <ScriptText script={s} size={24}>
                    {SAMPLE[s.id]}
                  </ScriptText>
                </View>
              </View>
              <AppText variant="heading" numberOfLines={1}>
                {t(`scripts.${s.id}.name`)}
              </AppText>
              <AppText variant="caption">
                {t('common.starsOf', { count: tl.stars, total: tl.maxStars })}
              </AppText>
            </Pressy>
          );
        })}
      </View>

      <AppText variant="label">{t('progress.milestones')}</AppText>
      <Card style={styles.milestones}>
        {list.map((a) => {
          const title = t(`progress.achievements.${a.id}.title`);
          const body = t(`progress.achievements.${a.id}.body`);
          return (
            <View
              key={a.id}
              style={styles.milestone}
              accessible
              accessibilityLabel={t('progress.achievementA11y', {
                title,
                body,
                state: a.done
                  ? t('progress.achieved')
                  : t('progress.percent', { percent: Math.round(a.progress * 100) }),
              })}
            >
              <View
                style={[
                  styles.badge,
                  { backgroundColor: a.done ? theme.star : theme.surfaceRaised },
                ]}
              >
                <Ionicons name={ICONS[a.id]} size={20} color={a.done ? '#2a1d00' : theme.faint} />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading" color={a.done ? theme.text : theme.muted}>
                  {title}
                </AppText>
                <AppText variant="caption">{body}</AppText>
                {!a.done && (
                  <View style={[styles.bar, { backgroundColor: theme.surfaceRaised }]}>
                    <View
                      style={[
                        styles.barFill,
                        { backgroundColor: theme.star, width: `${Math.round(a.progress * 100)}%` },
                      ]}
                    />
                  </View>
                )}
              </View>
              {a.done && <Ionicons name="checkmark-circle" size={22} color={theme.success} />}
            </View>
          );
        })}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: '45%', gap: 2, padding: 14 },
  statValue: { fontFamily: FONTS.display, fontSize: 30, lineHeight: 36 },
  calendarCard: { gap: 12 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { width: '12.4%', aspectRatio: 1, borderRadius: 8, borderWidth: 1 },
  scripts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scriptTile: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
  },
  ring: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  ringInner: { position: 'absolute' },
  milestones: { gap: 16 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  bar: { height: 5, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
});
