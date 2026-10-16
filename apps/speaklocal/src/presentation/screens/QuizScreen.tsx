import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { makeQuiz, percent, type Question } from '@/application/quiz/quiz';
import { allPhrases, scenePhrases } from '@/domain/content/catalogue';
import { isSceneId } from '@/domain/content/scenes';
import type { SceneId } from '@/domain/content/types';
import { HindiText, NativeText, NoVoiceNote, PhraseText, ProgressRing } from '../components/Bits';
import { AppText, Button, Card, IconButton, Pressy } from '../components/Kit';
import { useContent } from '../state/useContent';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const COUNT = 8;

/** Eight quick questions from one scene (or a mix of every open scene). */
export function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sceneId = isSceneId(id) ? id : null;
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, sounds, haptics, calmMotion } = useSettings();
  const { lang, openScenes, sceneOpen } = useContent();
  const { answer: record, scene: markScene } = useProgress();
  const voice = useVoice();
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const canListen = !!voice.voiceFor(lang);

  // Keyed on plain values, so the quiz never reshuffles under the learner.
  const own = sceneId !== null && sceneOpen(sceneId);
  const openKey = openScenes.join(',');
  const quiz = useMemo<Question[]>(() => {
    const scenes = openKey.split(',') as SceneId[];
    const everything = allPhrases(lang, scenes);
    const pool = own && sceneId ? scenePhrases(lang, sceneId) : everything;
    return makeQuiz(pool, seed, { count: COUNT, canListen, distractors: everything });
  }, [sceneId, own, lang, openKey, seed, canListen]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState(0);
  const q = quiz[index];
  const finished = index >= quiz.length && quiz.length > 0;
  const { say, stop } = voice;

  useEffect(() => {
    if (q && q.kind === 'listen' && picked === null) {
      const timer = setTimeout(() => say(q.answer), 400);
      return () => clearTimeout(timer);
    }
  }, [q, picked, say]);
  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (finished && sceneId) {
      markScene(lang, sceneId, { quizBest: percent(correct, quiz.length) });
    }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (i: number) => {
    if (!q || picked !== null) return;
    setPicked(i);
    const right = i === q.correct;
    record(q.answer.key, right);
    if (right) {
      setCorrect((c) => c + 1);
      sounds.play('correct');
      haptics.pop();
    } else {
      setMissed((m) => m + 1);
      sounds.play('wrong');
      haptics.thump();
    }
    if (q.kind !== 'listen' && canListen) say(q.answer);
  };

  const next = () => {
    stop();
    setPicked(null);
    setIndex((i) => i + 1);
  };

  const restart = () => {
    setSeed((s) => s + 7919);
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setMissed(0);
  };

  const title = sceneId ? t(`scenes.${sceneId}.title`) : t('quiz.mixTitle');
  const header = (
    <View style={styles.header}>
      <IconButton
        icon="close"
        label={t('common.close')}
        plain
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      <View style={styles.flex}>
        <AppText variant="heading" numberOfLines={1}>
          {title}
        </AppText>
        {!finished && quiz.length > 0 && (
          <AppText variant="caption">
            {t('quiz.position', { index: index + 1, total: quiz.length })}
          </AppText>
        )}
      </View>
    </View>
  );

  if (quiz.length === 0) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}
      >
        <View style={styles.content}>
          {header}
          <AppText center>{t('quiz.empty')}</AppText>
        </View>
      </View>
    );
  }

  if (finished) {
    const score = percent(correct, quiz.length);
    const titleKey =
      score >= 85
        ? 'quiz.resultTitle_great'
        : score >= 60
          ? 'quiz.resultTitle_good'
          : 'quiz.resultTitle_try';
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}
      >
        <View style={styles.content}>
          {header}
          <Animated.View
            entering={calmMotion ? undefined : ZoomIn.springify().damping(14)}
            style={styles.result}
          >
            <View style={styles.ring}>
              <ProgressRing
                value={correct / quiz.length}
                size={150}
                stroke={12}
                color={theme.accent}
              />
              <View style={styles.ringLabel}>
                <AppText variant="display">{`${score}%`}</AppText>
              </View>
            </View>
            <AppText variant="title" center accessibilityRole="header">
              {t(titleKey)}
            </AppText>
            <AppText center color={theme.muted}>
              {t('quiz.score', { correct, total: quiz.length })}
            </AppText>
            <AppText center variant="caption">
              {missed > 0 ? t('quiz.missed') : t('quiz.allRight')}
            </AppText>
          </Animated.View>
          <Button icon="refresh" label={t('quiz.again')} onPress={restart} />
          {missed > 0 && (
            <Button
              kind="teal"
              icon="repeat"
              label={t('home.review')}
              onPress={() => router.replace('/review')}
            />
          )}
          <Button
            kind="secondary"
            label={t('quiz.done')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </View>
      </View>
    );
  }

  const answered = picked !== null;
  const nativeOptions = q!.kind !== 'meaning';
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 },
        ]}
      >
        {header}
        <View style={[styles.bar, { backgroundColor: theme.track }]}>
          <View
            style={[
              styles.barFill,
              { backgroundColor: theme.accent, width: `${(index / quiz.length) * 100}%` },
            ]}
          />
        </View>

        <Animated.View
          key={`${seed}-${index}`}
          entering={calmMotion ? undefined : FadeInDown.springify().damping(18)}
        >
          <Card style={styles.prompt}>
            {q!.kind === 'say' && (
              <>
                <AppText variant="label" color={theme.accentText}>
                  {t('quiz.sayPrompt')}
                </AppText>
                <AppText variant="title">{q!.answer.en}</AppText>
                {settings.hindiMeanings && lang !== 'hi' && <HindiText>{q!.answer.hi}</HindiText>}
              </>
            )}
            {q!.kind === 'meaning' && (
              <>
                <AppText variant="label" color={theme.accentText}>
                  {t('quiz.meaningPrompt')}
                </AppText>
                <PhraseText phrase={q!.answer} size={30} hideMeaning bigRoman={!canListen} />
                {canListen && (
                  <Button
                    compact
                    kind="secondary"
                    icon="volume-medium-outline"
                    label={t('quiz.hearAgain')}
                    onPress={() => say(q!.answer)}
                    style={styles.left}
                  />
                )}
              </>
            )}
            {q!.kind === 'listen' && (
              <>
                <AppText variant="label" color={theme.accentText}>
                  {t('quiz.listenPrompt')}
                </AppText>
                <Pressy
                  onPress={() => say(q!.answer)}
                  accessibilityLabel={t('quiz.hearAgain')}
                  style={[styles.bigHear, { backgroundColor: theme.teal }]}
                >
                  <Ionicons
                    name={voice.speaking === q!.answer.key ? 'volume-high' : 'volume-medium'}
                    size={44}
                    color={theme.onTeal}
                  />
                </Pressy>
              </>
            )}
          </Card>
        </Animated.View>

        {!canListen && voice.voices !== null && index === 0 && <NoVoiceNote lang={lang} compact />}

        <View style={styles.options} accessibilityRole="radiogroup">
          {q!.options.map((o, i) => {
            const isRight = i === q!.correct;
            const isPicked = picked === i;
            const show = answered && (isRight || isPicked);
            const border = show ? (isRight ? theme.success : theme.danger) : theme.border;
            return (
              <Pressy
                key={o.key}
                onPress={() => choose(i)}
                disabled={answered}
                accessibilityRole="radio"
                accessibilityState={{ checked: isPicked, disabled: answered }}
                accessibilityLabel={t('quiz.optionA11y', {
                  index: i + 1,
                  text: nativeOptions ? o.roman : o.en,
                })}
                style={[
                  styles.option,
                  {
                    borderColor: border,
                    backgroundColor: show && isRight ? theme.highlight : theme.surface,
                    opacity: answered && !show ? 0.55 : 1,
                  },
                ]}
              >
                <View style={styles.flex}>
                  {nativeOptions ? (
                    <>
                      <NativeText lang={o.lang} size={21}>
                        {o.native}
                      </NativeText>
                      <AppText style={styles.roman}>{o.roman}</AppText>
                    </>
                  ) : (
                    <AppText variant="heading">{o.en}</AppText>
                  )}
                </View>
                {show && (
                  <Ionicons
                    name={isRight ? 'checkmark-circle' : 'close-circle'}
                    size={26}
                    color={isRight ? theme.success : theme.danger}
                  />
                )}
              </Pressy>
            );
          })}
        </View>
        {answered && (
          <Animated.View entering={FadeIn} accessibilityLiveRegion="polite">
            <AppText
              center
              color={picked === q!.correct ? theme.success : theme.text}
              style={styles.feedback}
            >
              {picked === q!.correct ? t('quiz.right') : t('quiz.wrong')}
            </AppText>
            {nativeOptions && (
              <AppText center variant="caption">
                {q!.answer.en}
              </AppText>
            )}
          </Animated.View>
        )}
      </ScrollView>
      {answered && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.footInner}>
            <Button
              icon="arrow-forward"
              label={index === quiz.length - 1 ? t('quiz.finish') : t('quiz.next')}
              onPress={next}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  left: { alignSelf: 'flex-start' },
  content: { paddingHorizontal: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  prompt: { gap: 10, paddingVertical: 20 },
  bigHear: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  options: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  roman: { fontFamily: FONTS.bodyHeavy, fontSize: 15, lineHeight: 20 },
  feedback: { fontFamily: FONTS.bodyHeavy, fontSize: 17 },
  result: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  ring: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  footInner: { width: '100%', maxWidth: 608, alignSelf: 'center' },
});
