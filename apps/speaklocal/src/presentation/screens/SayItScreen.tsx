import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { pauseFor } from '@/application/phrases/phrases';
import { yourPhrases } from '@/domain/content/catalogue';
import { isSceneId } from '@/domain/content/scenes';
import type { SceneId } from '@/domain/content/types';
import type { Recording } from '@/domain/entities/Recording';
import { clips, recorder } from '@/config/container';
import { Note, NoVoiceNote, PhraseText } from '../components/Bits';
import { AppText, Button, Card, IconButton, Pressy } from '../components/Kit';
import { useContent } from '../state/useContent';
import { useProgress } from '../state/ProgressProvider';
import { useRecordings } from '../state/RecordingsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

type Step = 'listen' | 'turn' | 'again' | 'idle';
type Mic = 'idle' | 'recording' | 'denied' | 'failed' | 'unsupported';

/** Shadowing: hear it, say it in the pause, hear it again. Record yourself if you like. */
export function SayItScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sceneId: SceneId = isSceneId(id) ? id : 'greetings';
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, sounds, haptics, calmMotion } = useSettings();
  const { lang, sceneOpen, plus } = useContent();
  const { practised, addToReview, inReview } = useProgress();
  const voice = useVoice();
  const takes = useRecordings();
  const list = useMemo(() => yourPhrases(lang, sceneId), [lang, sceneId]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>('idle');
  const [mic, setMic] = useState<Mic>(recorder.supported() ? 'idle' : 'unsupported');
  const [playingTake, setPlayingTake] = useState<string | null>(null);
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phrase = list[Math.min(index, list.length - 1)];
  const hasVoice = phrase ? voice.canHear(phrase) : false;
  const slow = settings.speed === 'slow';
  const open = sceneOpen(sceneId);

  const cancel = useCallback(() => {
    run.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const { say, stop: hush } = voice;
  const cycle = useCallback(() => {
    if (!phrase) return;
    cancel();
    const token = run.current;
    const alive = () => run.current === token;
    const pause = () => {
      setStep('turn');
      timer.current = setTimeout(
        () => {
          if (!alive()) return;
          if (!hasVoice) {
            setStep('idle');
            return;
          }
          setStep('again');
          say(phrase, { onEnd: () => alive() && setStep('idle') });
        },
        pauseFor(phrase, slow),
      );
    };
    practised([phrase.key]);
    if (!hasVoice) {
      pause();
      return;
    }
    setStep('listen');
    say(phrase, { onEnd: () => alive() && pause() });
  }, [phrase, cancel, hasVoice, say, slow, practised]);

  // Each new phrase plays its cycle once, on its own.
  useEffect(() => {
    if (!open) return;
    const start = setTimeout(cycle, 350);
    return () => clearTimeout(start);
  }, [index, open, voice.voices]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      cancel();
      hush();
      clips.stop();
    },
    [cancel, hush],
  );

  const go = (d: number) => {
    cancel();
    hush();
    setStep('idle');
    setIndex((i) => Math.max(0, Math.min(list.length - 1, i + d)));
  };

  const record = async () => {
    if (!phrase) return;
    if (mic === 'recording') {
      sounds.play('recStop');
      haptics.tap();
      const take = await recorder.stop();
      setMic('idle');
      if (!take) {
        setMic('failed');
        return;
      }
      await takes.add(take.uri, phrase.key, take.durationMs);
      return;
    }
    cancel();
    hush();
    clips.stop();
    setStep('idle');
    // The microphone permission is asked here, on the first tap, never before.
    let permission = await recorder.permission();
    if (permission !== 'granted') {
      permission = (await recorder.requestPermission()) ? 'granted' : 'denied';
    }
    if (permission !== 'granted') {
      setMic('denied');
      return;
    }
    const started = await recorder.start();
    if (!started) {
      setMic('failed');
      return;
    }
    sounds.play('recStart');
    haptics.pop();
    setMic('recording');
  };

  const playTake = (r: Recording) => {
    hush();
    setPlayingTake(r.id);
    clips.play(r.uri, () => setPlayingTake((p) => (p === r.id ? null : p)));
  };

  if (!phrase || !open) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}
      >
        <IconButton
          icon="chevron-back"
          label={t('common.back')}
          plain
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const mine = takes.takesFor(phrase.key);
  const steps: Step[] = hasVoice ? ['listen', 'turn', 'again'] : ['turn'];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <View style={styles.header}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            plain
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <View style={styles.flex}>
            <AppText variant="title" accessibilityRole="header">
              {t('say.title')}
            </AppText>
            <AppText variant="caption">
              {t(`scenes.${sceneId}.title`)} ·{' '}
              {t('say.position', { index: index + 1, total: list.length })}
            </AppText>
          </View>
        </View>

        <View style={[styles.track, { backgroundColor: theme.track }]}>
          <View
            style={[
              styles.trackFill,
              { backgroundColor: theme.teal, width: `${((index + 1) / list.length) * 100}%` },
            ]}
          />
        </View>

        <Card style={[styles.card, step === 'turn' && { borderColor: theme.accent }]}>
          <View
            style={styles.steps}
            accessible
            accessibilityLabel={t('say.stepsA11y', { step: stepLabel(step, t) })}
          >
            {steps.map((s) => (
              <StepPill
                key={s}
                label={stepLabel(s, t)}
                active={step === s}
                pulse={!calmMotion && step === s && s === 'turn'}
              />
            ))}
          </View>
          <PhraseText phrase={phrase} size={34} center bigRoman={!hasVoice} />
          {phrase.note && <Note text={phrase.note} />}
          {step === 'turn' && <Countdown ms={pauseFor(phrase, slow)} />}
          <View style={styles.row}>
            <Button
              kind="teal"
              icon="refresh"
              label={t('say.replay')}
              onPress={cycle}
              style={styles.flex}
            />
            <IconButton
              icon={inReview(phrase.key) ? 'bookmark' : 'bookmark-outline'}
              label={inReview(phrase.key) ? t('review.added') : t('review.add')}
              active={inReview(phrase.key)}
              plain
              onPress={() => addToReview(phrase.key)}
            />
            <IconButton
              icon="expand-outline"
              label={t('scene.showA11y')}
              plain
              onPress={() => router.push(`/show/${encodeURIComponent(phrase.key)}`)}
            />
          </View>
        </Card>
        {!hasVoice && voice.voices !== null && <NoVoiceNote lang={lang} compact />}
        {step === 'idle' && index === 0 && (
          <AppText variant="caption" center>
            {t('say.autoplayHint')}
          </AppText>
        )}

        <Card style={styles.recordCard}>
          <AppText variant="heading">{t('say.recordTitle')}</AppText>
          <AppText variant="caption">{t('say.recordBody')}</AppText>
          {mic === 'unsupported' ? (
            <AppText variant="caption" color={theme.text}>
              {t('say.micUnavailable')}
            </AppText>
          ) : (
            <Button
              kind={mic === 'recording' ? 'secondary' : 'primary'}
              icon={mic === 'recording' ? 'stop-circle' : 'mic'}
              label={mic === 'recording' ? t('say.stop') : t('say.record')}
              onPress={() => void record()}
            />
          )}
          {mic === 'recording' && (
            <View style={styles.recRow} accessibilityLiveRegion="polite">
              <RecDot calm={calmMotion} />
              <AppText color={theme.danger}>{t('say.recording')}</AppText>
            </View>
          )}
          {mic === 'denied' && (
            <AppText variant="caption" color={theme.text}>
              {t('say.micDenied')}
            </AppText>
          )}
          {mic === 'failed' && (
            <AppText variant="caption" color={theme.danger}>
              {t('say.micFailed')}
            </AppText>
          )}
          {mine.length > 0 && (
            <View style={styles.takes}>
              <View style={styles.row}>
                {hasVoice && (
                  <Button
                    compact
                    kind="secondary"
                    icon="volume-medium-outline"
                    label={t('say.playNative')}
                    onPress={() => {
                      clips.stop();
                      say(phrase);
                    }}
                    style={styles.flex}
                  />
                )}
                <Button
                  compact
                  kind="teal"
                  icon={playingTake === mine[0]!.id ? 'pause' : 'person-outline'}
                  label={t('say.playMine')}
                  onPress={() => playTake(mine[0]!)}
                  style={styles.flex}
                />
                <IconButton
                  icon="trash-outline"
                  label={t('say.deleteTake')}
                  plain
                  onPress={() => void takes.remove(mine[0]!)}
                />
              </View>
              {plus && mine.length > 1 && (
                <>
                  <AppText variant="caption">{t('say.takes', { count: mine.length })}</AppText>
                  {mine.slice(1).map((r) => (
                    <Pressy
                      key={r.id}
                      onPress={() => playTake(r)}
                      accessibilityLabel={`${t('say.playMine')} ${new Date(r.at).toLocaleString()}`}
                      style={[styles.take, { backgroundColor: theme.surfaceRaised }]}
                    >
                      <Ionicons
                        name={playingTake === r.id ? 'pause' : 'play'}
                        size={16}
                        color={theme.accentText}
                      />
                      <AppText variant="caption" color={theme.text} style={styles.flex}>
                        {new Date(r.at).toLocaleString()}
                      </AppText>
                      <AppText variant="caption">{(r.durationMs / 1000).toFixed(1)} s</AppText>
                    </Pressy>
                  ))}
                </>
              )}
              {!plus && <AppText variant="caption">{t('say.freeTakes')}</AppText>}
            </View>
          )}
        </Card>
      </ScrollView>

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
            kind="secondary"
            icon="chevron-back"
            label={t('common.previous')}
            disabled={index === 0}
            onPress={() => go(-1)}
            style={styles.flex}
          />
          <Button
            icon="chevron-forward"
            label={index === list.length - 1 ? t('common.done') : t('common.next')}
            onPress={() => (index === list.length - 1 ? router.back() : go(1))}
            style={styles.flex}
          />
        </View>
      </View>
    </View>
  );
}

function stepLabel(s: Step, t: (k: 'say.listen' | 'say.yourTurn' | 'say.again') => string) {
  return s === 'listen' ? t('say.listen') : s === 'turn' ? t('say.yourTurn') : t('say.again');
}

function StepPill({ label, active, pulse }: { label: string; active: boolean; pulse: boolean }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.set(
      pulse
        ? withRepeat(
            withSequence(withTiming(1.06, { duration: 420 }), withTiming(1, { duration: 420 })),
            -1,
          )
        : withTiming(1),
    );
  }, [pulse, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View
      style={[styles.pill, { backgroundColor: active ? theme.accent : theme.surfaceRaised }, style]}
    >
      <AppText
        variant="caption"
        color={active ? theme.onAccent : theme.muted}
        style={styles.pillText}
      >
        {label}
      </AppText>
    </Animated.View>
  );
}

function Countdown({ ms }: { ms: number }) {
  const theme = useTheme();
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(0);
    fill.set(withTiming(1, { duration: ms, easing: Easing.linear }));
  }, [ms, fill]);
  const bar = useAnimatedStyle(() => ({ width: `${(1 - fill.get()) * 100}%` }));
  return (
    <View style={[styles.count, { backgroundColor: theme.track }]}>
      <Animated.View style={[styles.countBar, { backgroundColor: theme.accent }, bar]} />
    </View>
  );
}

function RecDot({ calm }: { calm: boolean }) {
  const theme = useTheme();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!calm)
      o.set(
        withRepeat(
          withSequence(withTiming(0.3, { duration: 500 }), withTiming(1, { duration: 500 })),
          -1,
        ),
      );
  }, [calm, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[styles.recDot, { backgroundColor: theme.danger }, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: 6, borderRadius: 3 },
  card: { gap: 14, paddingVertical: 20, borderWidth: 2 },
  steps: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  pill: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  pillText: { fontFamily: FONTS.bodyHeavy },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  count: { height: 8, borderRadius: 4, overflow: 'hidden' },
  countBar: { height: 8, borderRadius: 4 },
  recordCard: { gap: 10 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 12, height: 12, borderRadius: 6 },
  takes: { gap: 8, marginTop: 4 },
  take: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 10,
    minHeight: 44,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  footInner: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 608, alignSelf: 'center' },
});
