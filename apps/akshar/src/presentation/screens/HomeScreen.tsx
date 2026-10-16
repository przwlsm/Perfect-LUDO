import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { letterOfTheDay } from '@/application/learning/learning';
import { nextLetterIndex, streak, tally, totalStars } from '@/domain/entities/Progress';
import type { ScriptId } from '@/domain/entities/Script';
import { lettersOf } from '@/domain/entities/Script';
import { SCRIPTS, scriptById } from '@/domain/entities/scripts';
import { ProgressRing, SAMPLE, ScriptText } from '../components/Bits';
import { AppText, Button, Card, IconButton, Pressy, Sheet } from '../components/Kit';
import { isGlossaryKey } from '../i18n';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

function greetingKey(hour: number) {
  if (hour < 5) return 'night' as const;
  if (hour < 12) return 'morning' as const;
  if (hour < 17) return 'afternoon' as const;
  if (hour < 22) return 'evening' as const;
  return 'night' as const;
}

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, calmMotion } = useSettings();
  const { progress } = useProgress();
  const [adding, setAdding] = useState(false);
  const now = useMemo(() => new Date(), []);

  const daily = useMemo(() => letterOfTheDay(settings.scripts, now), [settings.scripts, now]);
  if (!settings.onboarded) return <Redirect href="/welcome" />;

  const dailyScript = scriptById(daily.script);
  const dailyLetter = lettersOf(dailyScript)[daily.index]!;
  const days = streak(progress, now);
  const enter = (i: number) =>
    calmMotion
      ? undefined
      : FadeInDown.delay(60 * i)
          .springify()
          .damping(18);
  const meaning = isGlossaryKey(dailyLetter.meaning) ? t(`glossary.${dailyLetter.meaning}`) : '';
  const others = SCRIPTS.filter((s) => !settings.scripts.includes(s.id));

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="caption">{t(`greeting.${greetingKey(now.getHours())}`)}</AppText>
            <View style={styles.brandRow}>
              <AppText variant="display" accessibilityRole="header">
                {t('app.name')}
              </AppText>
              <ScriptText
                script={scriptById('devanagari')}
                size={22}
                color={theme.vermilion}
                style={styles.brandNative}
              >
                अक्षर
              </ScriptText>
            </View>
          </View>
          <IconButton
            icon="settings-outline"
            label={t('home.settings')}
            plain
            onPress={() => router.push('/settings')}
          />
        </View>

        <Animated.View entering={enter(0)}>
          <Pressy
            onPress={() => router.push(`/trace/${daily.script}/${daily.index}`)}
            accessibilityLabel={t('home.letterOfDayA11y', {
              letter: dailyLetter.translit,
              translit: dailyLetter.wordTranslit,
              script: t(`scripts.${daily.script}.name`),
            })}
            style={[
              styles.daily,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                boxShadow: `0 12px 30px ${theme.shadow}`,
              },
            ]}
          >
            <View
              style={[
                styles.dailyLetter,
                { backgroundColor: theme.tints[SCRIPTS.indexOf(dailyScript)] },
              ]}
            >
              <ScriptText script={dailyScript} size={92} style={styles.bigLetter}>
                {dailyLetter.char}
              </ScriptText>
            </View>
            <View style={styles.dailyText}>
              <AppText variant="label" color={theme.accentText}>
                {t('home.letterOfDay')}
              </AppText>
              <AppText variant="translit" numberOfLines={1}>
                {dailyLetter.translit}
              </AppText>
              <AppText variant="caption" numberOfLines={2}>
                {t(`scripts.${daily.script}.name`)} · {dailyLetter.wordTranslit} “{meaning}”
              </AppText>
              <View style={[styles.cta, { backgroundColor: theme.accent }]}>
                <Ionicons name="create-outline" size={16} color={theme.onAccent} />
                <AppText variant="heading" color={theme.onAccent} style={styles.ctaText}>
                  {t('home.traceIt')}
                </AppText>
              </View>
            </View>
          </Pressy>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.chips}>
          <View
            style={[
              styles.chip,
              { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={days > 0 ? 'flame' : 'flame-outline'}
              size={18}
              color={days > 0 ? theme.vermilion : theme.faint}
            />
            <AppText variant="heading" style={styles.chipText} numberOfLines={1}>
              {days > 0 ? t('home.streak', { count: days }) : t('home.noStreak')}
            </AppText>
          </View>
          {progress.days.length > 0 && (
            <View
              style={[
                styles.chip,
                { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.accentText} />
              <AppText variant="heading" style={styles.chipText} numberOfLines={1}>
                {t('home.daysWritten', { count: progress.days.length })}
              </AppText>
            </View>
          )}
        </Animated.View>

        <AppText variant="label" style={styles.section}>
          {t('home.yourScripts')}
        </AppText>
        {settings.scripts.map((id, i) => (
          <Animated.View key={id} entering={enter(2 + i)}>
            <ScriptCard id={id} />
          </Animated.View>
        ))}
        {others.length > 0 && (
          <Pressy
            onPress={() => setAdding(true)}
            accessibilityLabel={t('home.addScript')}
            style={[styles.add, { borderColor: theme.faint }]}
          >
            <Ionicons name="add-circle-outline" size={22} color={theme.accentText} />
            <AppText variant="heading" color={theme.accentText}>
              {t('home.addScript')}
            </AppText>
          </Pressy>
        )}

        <View style={styles.pair}>
          <Pressy
            style={styles.flex}
            onPress={() => router.push('/slate')}
            accessibilityLabel={t('home.slateTitle')}
          >
            <Card style={styles.tile}>
              <Ionicons name="brush-outline" size={26} color={theme.accentText} />
              <AppText variant="heading">{t('home.slateTitle')}</AppText>
              <AppText variant="caption">{t('home.slateBody')}</AppText>
            </Card>
          </Pressy>
          <Pressy
            style={styles.flex}
            onPress={() => router.push('/progress')}
            accessibilityLabel={t('home.progressTitle')}
          >
            <Card style={styles.tile}>
              <Ionicons name="ribbon-outline" size={26} color={theme.accentText} />
              <AppText variant="heading">{t('home.progressTitle')}</AppText>
              <AppText variant="caption">
                {t('home.progressBody', {
                  stars: totalStars(progress),
                  letters: Object.keys(progress.stars).length,
                })}
              </AppText>
            </Card>
          </Pressy>
        </View>

        <Card style={styles.support}>
          <AppText variant="heading">{t('home.supportTitle')}</AppText>
          <AppText variant="caption">{t('home.supportBody')}</AppText>
          <Button
            kind="secondary"
            compact
            icon="heart-outline"
            label={t('home.supportCta')}
            onPress={() => router.push('/support')}
            style={styles.supportButton}
          />
        </Card>
      </ScrollView>

      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('home.addScriptTitle')}>
        {others.map((s) => (
          <Pressy
            key={s.id}
            onPress={() => {
              update({ scripts: [...settings.scripts, s.id] });
              setAdding(false);
            }}
            accessibilityLabel={t('onboarding.pickA11y', {
              name: t(`scripts.${s.id}.name`),
              languages: t(`scripts.${s.id}.languages`),
            })}
            style={[
              styles.addRow,
              { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
            ]}
          >
            <ScriptText script={s} size={30} style={styles.addLetter}>
              {lettersOf(s)[0]!.char}
            </ScriptText>
            <View style={styles.flex}>
              <AppText variant="heading">{t(`scripts.${s.id}.name`)}</AppText>
              <AppText variant="caption">{t(`scripts.${s.id}.languages`)}</AppText>
            </View>
            <Ionicons name="add" size={22} color={theme.accentText} />
          </Pressy>
        ))}
      </Sheet>
    </View>
  );
}

function ScriptCard({ id }: { id: ScriptId }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { progress } = useProgress();
  const script = scriptById(id);
  const tl = tally(progress, script);
  const next = lettersOf(script)[nextLetterIndex(progress, script)]!;
  const tint = theme.tints[SCRIPTS.indexOf(script)];
  return (
    <Pressy
      onPress={() => router.push(`/script/${id}`)}
      accessibilityLabel={t('home.scriptA11y', {
        name: t(`scripts.${id}.name`),
        started: tl.started,
        total: tl.letters,
      })}
      style={[styles.scriptCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={[styles.scriptGlyph, { backgroundColor: tint }]}>
        <ScriptText script={script} size={42} style={styles.scriptGlyphText}>
          {SAMPLE[id]}
        </ScriptText>
      </View>
      <View style={styles.flex}>
        <AppText variant="heading">{t(`scripts.${id}.name`)}</AppText>
        <AppText variant="caption" numberOfLines={1}>
          {t(`scripts.${id}.languages`)}
        </AppText>
        <View style={styles.nextRow}>
          <AppText variant="caption" color={theme.accentText} style={styles.nextLabel}>
            {t('home.continueWith', { letter: next.translit })}
          </AppText>
          <ScriptText script={script} size={18} color={theme.accentText}>
            {next.char}
          </ScriptText>
        </View>
      </View>
      <View style={styles.ring}>
        <ProgressRing value={tl.stars / tl.maxStars} size={54} />
        <View style={styles.ringLabel}>
          <AppText variant="caption" color={theme.text} style={styles.ringText}>
            {`${tl.started}/${tl.letters}`}
          </AppText>
        </View>
      </View>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  brandNative: { lineHeight: 34 },
  flex: { flex: 1 },
  daily: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: 1,
    padding: 12,
    gap: 14,
    alignItems: 'center',
  },
  dailyLetter: {
    width: 128,
    height: 148,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bigLetter: { textAlign: 'center' },
  dailyText: { flex: 1, gap: 3 },
  cta: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    minHeight: 40,
    marginTop: 6,
  },
  ctaText: { fontSize: 15 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    minHeight: 40,
  },
  chipText: { fontSize: 14 },
  section: { marginTop: 6 },
  scriptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    padding: 10,
    paddingRight: 14,
  },
  scriptGlyph: {
    width: 76,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scriptGlyphText: { textAlign: 'center' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  nextLabel: { fontFamily: FONTS.bodyBold },
  ring: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute' },
  ringText: { fontFamily: FONTS.bodyHeavy, fontSize: 11.5 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    paddingHorizontal: 14,
  },
  addLetter: { width: 44, textAlign: 'center' },
  pair: { flexDirection: 'row', gap: 12, marginTop: 6 },
  tile: { gap: 6, minHeight: 150 },
  support: { gap: 6 },
  supportButton: { alignSelf: 'flex-start', marginTop: 6 },
});
