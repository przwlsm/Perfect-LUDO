import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { localDay } from 'app-kit';
import { percent } from '@/application/quiz/quiz';
import { SCENES } from '@/domain/content/scenes';
import { sceneRecord, sceneStars, streak } from '@/domain/entities/Progress';
import { SceneDots } from '../components/Bits';
import { AppText, Button, Card, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { useContent } from '../state/useContent';
import { useProgress } from '../state/ProgressProvider';
import { useRecordings } from '../state/RecordingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

export function ProgressScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { lang, sceneOpen } = useContent();
  const { progress } = useProgress();
  const recordings = useRecordings();
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => {
    const set = new Set(progress.days);
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27 + i);
      return { key: localDay(d), on: set.has(localDay(d)), today: i === 27 };
    });
  }, [progress.days, now]);
  const active = days.filter((d) => d.on).length;
  const phrases = progress.practised.filter((k) => k.startsWith(`${lang}:`)).length;

  return (
    <Page title={t('progress.title')}>
      <AppText color={theme.muted}>{t('progress.lead')}</AppText>
      <View style={styles.stats}>
        <Stat
          icon="flame-outline"
          label={t('progress.streak')}
          value={String(streak(progress, now))}
        />
        <Stat
          icon="calendar-outline"
          label={t('progress.days')}
          value={String(progress.days.length)}
        />
        <Stat icon="chatbubbles-outline" label={t('progress.phrases')} value={String(phrases)} />
        <Stat
          icon="checkmark-done-outline"
          label={t('progress.accuracy')}
          value={
            progress.answered
              ? `${percent(progress.correct, progress.answered)}%`
              : t('progress.none')
          }
        />
      </View>

      <Card style={styles.group}>
        <AppText variant="label">{t('progress.calendar')}</AppText>
        <View
          style={styles.calendar}
          accessible
          accessibilityLabel={t('progress.calendarA11y', { count: active })}
        >
          {[0, 1, 2, 3].map((week) => (
            <View key={week} style={styles.week}>
              {days.slice(week * 7, week * 7 + 7).map((d) => (
                <View
                  key={d.key}
                  style={[
                    styles.day,
                    {
                      backgroundColor: d.on ? theme.teal : theme.surfaceRaised,
                      borderColor: d.today ? theme.accent : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.group}>
        <AppText variant="label">
          {t('progress.scenes', { language: t(`languages.${lang}`) })}
        </AppText>
        {SCENES.filter((s) => sceneOpen(s.id)).map((s) => (
          <Pressy
            key={s.id}
            onPress={() => router.push(`/scene/${s.id}`)}
            accessibilityLabel={t(`scenes.${s.id}.title`)}
            style={styles.sceneRow}
          >
            <Ionicons name={s.icon as never} size={20} color={theme.accentText} />
            <AppText style={styles.flex} numberOfLines={1}>
              {t(`scenes.${s.id}.title`)}
            </AppText>
            <SceneDots count={sceneStars(sceneRecord(progress, lang, s.id))} />
          </Pressy>
        ))}
      </Card>

      <Card style={styles.group}>
        <AppText variant="heading">{t('progress.recordingsTitle')}</AppText>
        <AppText variant="caption">
          {t('progress.recordings', { count: recordings.all.length })}
        </AppText>
        {recordings.all.length > 0 &&
          (confirm ? (
            <>
              <AppText color={theme.text}>{t('progress.deleteConfirm')}</AppText>
              <View style={styles.row}>
                <Button
                  kind="secondary"
                  compact
                  label={t('common.cancel')}
                  onPress={() => setConfirm(false)}
                  style={styles.flex}
                />
                <Button
                  compact
                  icon="trash-outline"
                  label={t('common.delete')}
                  onPress={() =>
                    void recordings.removeAll().then(() => {
                      setConfirm(false);
                      setNote(t('progress.deleted'));
                    })
                  }
                  style={styles.flex}
                />
              </View>
            </>
          ) : (
            <Button
              kind="secondary"
              compact
              icon="trash-outline"
              label={t('progress.deleteAll')}
              onPress={() => setConfirm(true)}
            />
          ))}
        {note && (
          <AppText variant="caption" color={theme.success} accessibilityLiveRegion="polite">
            {note}
          </AppText>
        )}
      </Card>
    </Page>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.stat}>
      <Ionicons name={icon} size={20} color={theme.accentText} />
      <AppText style={styles.value}>{value}</AppText>
      <AppText variant="caption" numberOfLines={2}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '47%', flexGrow: 1, gap: 4 },
  value: { fontFamily: FONTS.display, fontSize: 30, lineHeight: 36 },
  group: { gap: 10 },
  calendar: { gap: 6 },
  week: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, aspectRatio: 1, borderRadius: 8, borderWidth: 2 },
  sceneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  row: { flexDirection: 'row', gap: 10 },
});
