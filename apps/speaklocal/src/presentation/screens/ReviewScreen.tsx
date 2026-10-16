import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Grade } from '@/application/review/srs';
import { phraseByKey } from '@/domain/content/catalogue';
import { HindiText, Note, NoVoiceNote, PhraseText } from '../components/Bits';
import { AppText, Button, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useContent } from '../state/useContent';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Flashcards for the phrases due today: meaning first, then the answer, then how it went. */
export function ReviewScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings, sounds, haptics, calmMotion } = useSettings();
  const { lang } = useContent();
  const { due, review, progress } = useProgress();
  const voice = useVoice();
  // The session is fixed when it opens; grading moves cards out of "due".
  const [queue, setQueue] = useState<string[]>(() => due(lang));
  const [pos, setPos] = useState(0);
  const [shown, setShown] = useState(false);
  const [again, setAgain] = useState<ReadonlySet<string>>(new Set());
  const key = queue[pos];
  const phrase = key ? phraseByKey(key) : null;
  const { say, stop } = voice;

  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    if (shown && phrase && voice.canHear(phrase)) say(phrase);
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const grade = (g: Grade) => {
    if (!key) return;
    review(key, g);
    if (g === 'again') {
      haptics.tap();
      // One more look before the session ends.
      if (!again.has(key)) {
        setQueue((q) => [...q, key]);
        setAgain(new Set(again).add(key));
      }
    } else {
      sounds.play('correct');
      haptics.pop();
    }
    setShown(false);
    setPos((p) => p + 1);
  };

  const upcoming = Object.keys(progress.cards).filter((k) => k.startsWith(`${lang}:`)).length;

  if (queue.length === 0) {
    return (
      <Page title={t('review.title')}>
        <Card style={styles.empty}>
          <Ionicons name="leaf-outline" size={34} color={theme.accentText} />
          <AppText variant="title" center>
            {t('review.emptyTitle')}
          </AppText>
          <AppText center color={theme.muted}>
            {t('review.emptyBody')}
          </AppText>
          {upcoming > 0 && (
            <AppText variant="caption" center>
              {t('review.upcoming', { count: upcoming })}
            </AppText>
          )}
        </Card>
        <Button
          icon="help-buoy-outline"
          label={t('review.quiz')}
          onPress={() => router.replace('/quiz/mix')}
        />
      </Page>
    );
  }

  if (!phrase) {
    return (
      <Page title={t('review.title')}>
        <Animated.View entering={calmMotion ? undefined : FadeIn}>
          <Card style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={44} color={theme.success} />
            <AppText variant="title" center>
              {t('review.finishedTitle')}
            </AppText>
            <AppText center color={theme.muted}>
              {t('review.finishedBody')}
            </AppText>
          </Card>
        </Animated.View>
        <Button
          label={t('common.done')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      </Page>
    );
  }

  return (
    <Page title={t('review.title')}>
      <View style={styles.leadRow}>
        <AppText variant="caption" style={styles.flex}>
          {t('review.lead')}
        </AppText>
        <View style={[styles.count, { backgroundColor: theme.surfaceRaised }]}>
          <AppText variant="caption" color={theme.text}>
            {t('review.position', { index: Math.min(pos + 1, queue.length), total: queue.length })}
          </AppText>
        </View>
      </View>
      <Animated.View
        key={`${key}-${pos}`}
        entering={calmMotion ? undefined : FadeInDown.springify().damping(18)}
      >
        <Card style={styles.card}>
          <AppText variant="label" color={theme.accentText}>
            {t('review.prompt')}
          </AppText>
          <AppText variant="title">{phrase.en}</AppText>
          {settings.hindiMeanings && lang !== 'hi' && <HindiText>{phrase.hi}</HindiText>}
          {shown && (
            <Animated.View
              entering={FadeIn}
              style={[styles.answer, { borderTopColor: theme.border }]}
            >
              <PhraseText phrase={phrase} size={32} hideMeaning bigRoman={!voice.canHear(phrase)} />
              {voice.canHear(phrase) && (
                <Button
                  compact
                  kind="secondary"
                  icon="volume-medium-outline"
                  label={t('home.hear')}
                  onPress={() => say(phrase)}
                  style={styles.left}
                />
              )}
              {phrase.note && <Note text={phrase.note} />}
            </Animated.View>
          )}
        </Card>
      </Animated.View>
      {shown && !voice.canHear(phrase) && voice.voices !== null && (
        <NoVoiceNote lang={lang} compact />
      )}
      {!shown ? (
        <Button icon="eye-outline" label={t('review.show')} onPress={() => setShown(true)} />
      ) : (
        <View style={styles.grades}>
          <GradeButton
            label={t('review.again')}
            hint={t('review.againHint')}
            onPress={() => grade('again')}
          />
          <GradeButton
            label={t('review.good')}
            hint={t('review.goodHint')}
            primary
            onPress={() => grade('good')}
          />
          <GradeButton
            label={t('review.easy')}
            hint={t('review.easyHint')}
            onPress={() => grade('easy')}
          />
        </View>
      )}
    </Page>
  );
}

function GradeButton({
  label,
  hint,
  primary,
  onPress,
}: {
  label: string;
  hint: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.grade}>
      <Button
        label={label}
        kind={primary ? 'primary' : 'secondary'}
        onPress={onPress}
        accessibilityLabel={`${label}, ${hint}`}
      />
      <AppText variant="caption" center color={theme.muted}>
        {hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  count: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  card: { gap: 10, paddingVertical: 22 },
  answer: { gap: 10, borderTopWidth: 1, paddingTop: 14, marginTop: 4 },
  left: { alignSelf: 'flex-start' },
  grades: { flexDirection: 'row', gap: 10 },
  grade: { flex: 1, gap: 4 },
});
