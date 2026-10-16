import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { phraseOfTheDay } from '@/application/phrases/phrases';
import { LANGUAGES } from '@/domain/content/languages';
import { SCENES, sceneById } from '@/domain/content/scenes';
import type { SceneId } from '@/domain/content/types';
import { sceneRecord, sceneStars, streak } from '@/domain/entities/Progress';
import { NativeText, NoVoiceNote, PhraseText, SceneDots } from '../components/Bits';
import { AppText, Button, Card, IconButton, Pressy } from '../components/Kit';
import { Skyline } from '../skyline/Skyline';
import { useContent } from '../state/useContent';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

function greetingKey(hour: number) {
  if (hour < 5) return 'night' as const;
  if (hour < 12) return 'morning' as const;
  if (hour < 17) return 'afternoon' as const;
  if (hour < 22) return 'evening' as const;
  return 'night' as const;
}

const CORE = SCENES.filter((s) => s.pack === 'core').map((s) => s.id);

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings, calmMotion } = useSettings();
  const { progress, due } = useProgress();
  const { lang, city, sceneOpen, openScenes } = useContent();
  const voice = useVoice();
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => phraseOfTheDay(lang, CORE, now), [lang, now]);

  if (!settings.onboarded) return <Redirect href="/welcome" />;

  const days = streak(progress, now);
  const dueCount = due(lang).length;
  const heard = openScenes.filter((s) => sceneRecord(progress, lang, s).heard).length;
  const next: SceneId =
    progress.lastScene && sceneOpen(progress.lastScene)
      ? progress.lastScene
      : (CORE.find((s) => !sceneRecord(progress, lang, s).heard) ?? 'greetings');
  const nextRecord = sceneRecord(progress, lang, next);
  const started = progress.lastScene !== null;
  const enter = (i: number) =>
    calmMotion
      ? undefined
      : FadeInDown.delay(50 * i)
          .springify()
          .damping(18);
  const heroH = 236 + insets.top;
  const noVoice = voice.voiceFor(lang) === null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ height: heroH }}>
          <Skyline kind={city.skyline} width={width} height={heroH} lively />
          <View style={[styles.heroTop, { top: insets.top + 8 }]}>
            <View
              style={[
                styles.pill,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <AppText variant="caption" color={theme.text}>
                {t(`greeting.${greetingKey(now.getHours())}`)}
              </AppText>
            </View>
            <IconButton
              icon="settings-outline"
              label={t('home.settings')}
              onPress={() => router.push('/settings')}
            />
          </View>
          <View style={[styles.cityTagWrap, { top: insets.top + 70 }]}>
            <Pressy
              feedback={false}
              onPress={() => router.push('/settings')}
              accessibilityLabel={t('home.cityA11y', {
                city: t(`cities.${city.id}`),
                language: t(`languages.${lang}`),
              })}
              style={[
                styles.cityTag,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <AppText variant="title" accessibilityRole="header">
                {t(`cities.${city.id}`)}
              </AppText>
              <View style={styles.langRow}>
                <AppText variant="caption" color={theme.text}>
                  {t(`languages.${lang}`)}
                </AppText>
                <NativeText lang={lang} size={15} color={theme.accentText}>
                  {LANGUAGES[lang].nativeName}
                </NativeText>
              </View>
            </Pressy>
          </View>
        </View>

        <View style={styles.content}>
          {today && (
            <Animated.View entering={enter(0)}>
              <Card style={styles.today}>
                <View style={styles.rowBetween}>
                  <AppText variant="label" color={theme.accentText}>
                    {t('home.today')}
                  </AppText>
                  <View style={[styles.sceneTag, { backgroundColor: theme.surfaceRaised }]}>
                    <AppText variant="caption" numberOfLines={1}>
                      {t(`scenes.${today.scene}.title`)}
                    </AppText>
                  </View>
                </View>
                <View
                  accessible
                  accessibilityLabel={t('home.todayA11y', {
                    roman: today.roman,
                    meaning: today.en,
                  })}
                >
                  <PhraseText phrase={today} size={30} bigRoman={noVoice} />
                </View>
                {noVoice && <NoVoiceNote lang={lang} compact />}
                <View style={styles.actions}>
                  {!noVoice && (
                    <Button
                      compact
                      kind="teal"
                      icon={voice.speaking === today.key ? 'volume-high' : 'volume-medium-outline'}
                      label={t('home.hear')}
                      onPress={() => voice.say(today)}
                    />
                  )}
                  <Button
                    compact
                    kind="secondary"
                    icon="expand-outline"
                    label={t('home.show')}
                    onPress={() => router.push(`/show/${encodeURIComponent(today.key)}`)}
                  />
                </View>
              </Card>
            </Animated.View>
          )}

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
                color={days > 0 ? '#e8590c' : theme.faint}
              />
              <AppText variant="heading" style={styles.chipText} numberOfLines={1}>
                {days > 0 ? t('home.streak', { count: days }) : t('home.noStreak')}
              </AppText>
            </View>
            {dueCount > 0 && (
              <Pressy
                onPress={() => router.push('/review')}
                accessibilityLabel={t('home.reviewDue', { count: dueCount })}
                style={[
                  styles.chip,
                  { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
                ]}
              >
                <Ionicons name="repeat" size={18} color={theme.accentText} />
                <AppText variant="heading" style={styles.chipText} numberOfLines={1}>
                  {t('home.reviewDue', { count: dueCount })}
                </AppText>
              </Pressy>
            )}
          </Animated.View>

          <Animated.View entering={enter(2)}>
            <Pressy
              onPress={() => router.push(`/scene/${next}`)}
              accessibilityLabel={`${started ? t('home.continueTitle') : t('home.startTitle')}: ${t(`scenes.${next}.title`)}`}
              style={[styles.next, { backgroundColor: theme.teal }]}
            >
              <View style={[styles.nextIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Ionicons name={sceneById(next).icon as never} size={26} color={theme.onTeal} />
              </View>
              <View style={styles.flex}>
                <AppText variant="label" color={theme.onTeal}>
                  {started ? t('home.continueTitle') : t('home.startTitle')}
                </AppText>
                <AppText variant="heading" color={theme.onTeal} numberOfLines={2}>
                  {t(`scenes.${next}.title`)}
                </AppText>
                <AppText variant="caption" color={theme.onTeal} numberOfLines={1}>
                  {t(`scenes.${next}.blurb`)}
                </AppText>
              </View>
              <View style={styles.nextEnd}>
                <SceneDots
                  count={sceneStars(nextRecord)}
                  color={theme.onTeal}
                  todo={theme.onTeal}
                />
                <Ionicons name="play-circle" size={34} color={theme.onTeal} />
              </View>
            </Pressy>
          </Animated.View>

          <Animated.View entering={enter(3)} style={styles.tiles}>
            <Tile
              icon="albums-outline"
              title={t('home.scenes')}
              body={t('home.scenesBody', { done: heard, total: openScenes.length })}
              onPress={() => router.push('/scenes')}
            />
            <Tile
              icon="book-outline"
              title={t('home.phrasebook')}
              body={t('home.phrasebookBody')}
              onPress={() => router.push('/phrasebook')}
            />
            <Tile
              icon="repeat-outline"
              title={t('home.review')}
              body={t('home.reviewBody', { count: dueCount })}
              badge={dueCount > 0 ? String(dueCount) : undefined}
              onPress={() => router.push('/review')}
            />
            <Tile
              icon="help-buoy-outline"
              title={t('home.quiz')}
              body={t('home.quizBody')}
              onPress={() => router.push('/quiz/mix')}
            />
          </Animated.View>

          <Pressy onPress={() => router.push('/progress')} accessibilityLabel={t('home.progress')}>
            <Card style={styles.progressRow}>
              <Ionicons name="stats-chart-outline" size={22} color={theme.accentText} />
              <View style={styles.flex}>
                <AppText variant="heading">{t('home.progress')}</AppText>
                <AppText variant="caption">
                  {t('home.progressBody', {
                    phrases: progress.practised.filter((k) => k.startsWith(`${lang}:`)).length,
                    days: progress.days.length,
                  })}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.faint} />
            </Card>
          </Pressy>

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
        </View>
      </ScrollView>
    </View>
  );
}

function Tile({
  icon,
  title,
  body,
  badge,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  badge?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={`${title}. ${body}`} style={styles.tileWrap}>
      <Card style={styles.tile}>
        <View style={styles.rowBetween}>
          <View style={[styles.tileIcon, { backgroundColor: theme.surfaceRaised }]}>
            <Ionicons name={icon} size={22} color={theme.accentText} />
          </View>
          {badge && (
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <AppText variant="caption" color={theme.onAccent} style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
          )}
        </View>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" numberOfLines={2}>
          {body}
        </AppText>
      </Card>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 14,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    marginTop: -12,
  },
  heroTop: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pill: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  cityTagWrap: { position: 'absolute', left: 16, top: 0, paddingTop: 0 },
  cityTag: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  today: { gap: 10 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sceneTag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
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
  next: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, padding: 14 },
  nextIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextEnd: { alignItems: 'center', gap: 6 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tileWrap: { width: '48%', flexGrow: 1 },
  tile: { gap: 6, minHeight: 138 },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontFamily: FONTS.bodyHeavy },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  support: { gap: 6 },
  supportButton: { alignSelf: 'flex-start', marginTop: 6 },
});
