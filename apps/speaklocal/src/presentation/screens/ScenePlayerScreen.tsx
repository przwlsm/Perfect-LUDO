import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { pauseFor, readingTime } from '@/application/phrases/phrases';
import { dialogue, extras } from '@/domain/content/catalogue';
import { isSceneId, sceneById } from '@/domain/content/scenes';
import type { Phrase, SceneId } from '@/domain/content/types';
import { passId } from '@/domain/entities/Bubbles';
import { HindiText, Note, NoVoiceNote, PhraseText } from '../components/Bits';
import { AppText, Button, Card, IconButton, Pressy, Segmented } from '../components/Kit';
import { LockedSheet, type LockedItem } from '../components/Offers';
import { useContent } from '../state/useContent';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { useBubbleLook, useTheme } from '../theme/ThemeProvider';

type Mode = 'listen' | 'turn';

export function ScenePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sceneId: SceneId = isSceneId(id) ? id : 'greetings';
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, seen, sounds, haptics } = useSettings();
  const { lang, sceneOpen } = useContent();
  const { open } = useEntitlements();
  const progress = useProgress();
  const voice = useVoice();
  const lines = useMemo(() => dialogue(lang, sceneId), [lang, sceneId]);
  const more = useMemo(() => extras(lang, sceneId), [lang, sceneId]);
  const scene = sceneById(sceneId);
  const isOpen = sceneOpen(sceneId);
  const bubblesOpen = open({
    id: passId('bubbles', settings.bubbles),
    premium: settings.bubbles !== 'classic',
  });
  const mine = useBubbleLook(bubblesOpen);
  const hasVoice = voice.voiceFor(lang) !== null;

  const [mode, setMode] = useState<Mode>('listen');
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());
  const [done, setDone] = useState<Mode | null>(null);
  const [locked, setLocked] = useState<LockedItem | null>(null);
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroll = useRef<ScrollView>(null);
  const ys = useRef<Record<number, number>>({});

  const { opened, practised, scene: markScene } = progress;
  useEffect(() => {
    if (isOpen) opened(sceneId);
  }, [isOpen, opened, sceneId]);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const stop = useCallback(() => {
    run.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    voice.stop();
    setPlaying(false);
    setCurrent(null);
    setWaiting(null);
  }, [voice]);

  // Leaving the screen stops the conversation.
  const silence = voice.stop;
  useEffect(
    () => () => {
      run.current++;
      if (timer.current) clearTimeout(timer.current);
      silence();
    },
    [silence],
  );

  const hear = (p: Phrase, then: () => void, token: number) => {
    const next = () => {
      if (run.current === token) timer.current = setTimeout(then, 380);
    };
    if (voice.canHear(p)) voice.say(p, { onEnd: next });
    else timer.current = setTimeout(next, readingTime(p));
  };

  const play = (from: number, m: Mode, shown: ReadonlySet<number>) => {
    const token = ++run.current;
    clear();
    voice.stop();
    setPlaying(true);
    setDone(null);
    seen('sceneTap');
    let reveal = new Set(shown);
    const step = (i: number) => {
      if (run.current !== token) return;
      if (i >= lines.length) {
        setPlaying(false);
        setCurrent(null);
        setDone(m);
        markScene(lang, sceneId, m === 'listen' ? { heard: true } : { spoke: true });
        practised(lines.map((l) => l.key));
        sounds.play('chime');
        haptics.delight();
        return;
      }
      const line = lines[i]!;
      setCurrent(i);
      practised([line.key]);
      const y = ys.current[i];
      if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
      if (m === 'turn' && line.speaker === 'you' && !reveal.has(i)) {
        setWaiting(i);
        haptics.tick();
        timer.current = setTimeout(
          () => {
            if (run.current !== token) return;
            setWaiting(null);
            reveal = new Set(reveal).add(i);
            setRevealed(reveal);
            hear(line, () => step(i + 1), token);
          },
          pauseFor(line, settings.speed === 'slow'),
        );
        return;
      }
      hear(line, () => step(i + 1), token);
    };
    step(from);
  };

  const tapLine = (i: number) => {
    stop();
    seen('sceneTap');
    const p = lines[i]!;
    if (mode === 'turn' && p.speaker === 'you' && !revealed.has(i)) {
      setRevealed(new Set(revealed).add(i));
    }
    setCurrent(i);
    if (voice.canHear(p)) voice.say(p, { onEnd: () => setCurrent((c) => (c === i ? null : c)) });
    practised([p.key]);
  };

  const switchMode = (m: Mode) => {
    stop();
    setMode(m);
    setRevealed(new Set());
    setDone(null);
  };

  const speedToggle = (
    <Pressy
      onPress={() => update({ speed: settings.speed === 'slow' ? 'normal' : 'slow' })}
      accessibilityLabel={`${t('scene.speed')}: ${settings.speed === 'slow' ? t('scene.slow') : t('scene.normal')}`}
      style={[styles.speed, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
    >
      <Ionicons
        name={settings.speed === 'slow' ? 'walk-outline' : 'bicycle-outline'}
        size={17}
        color={theme.accentText}
      />
      <AppText variant="heading" style={styles.speedText}>
        {settings.speed === 'slow' ? t('scene.slow') : t('scene.normal')}
      </AppText>
    </Pressy>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton
          icon="chevron-back"
          label={t('common.back')}
          plain
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <View style={styles.flex}>
          <AppText
            variant="title"
            accessibilityRole="header"
            numberOfLines={2}
            style={styles.title}
          >
            {t(`scenes.${sceneId}.title`)}
          </AppText>
        </View>
        {speedToggle}
      </View>

      {!isOpen ? (
        <View style={styles.lockedBox}>
          <Ionicons name="lock-closed-outline" size={36} color={theme.accentText} />
          <AppText center>{t('scene.locked')}</AppText>
          <Button
            label={t('sceneList.unlock')}
            icon="lock-open-outline"
            onPress={() =>
              setLocked({ id: passId('pack', scene.pack), title: t(`packs.${scene.pack}.title`) })
            }
          />
          <LockedSheet item={locked} onClose={() => setLocked(null)} />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scroll}
            contentContainerStyle={[styles.content, { paddingBottom: 170 + insets.bottom }]}
          >
            {sceneId === 'emergency' && (
              <Card style={[styles.tip, { borderColor: theme.danger }]}>
                <Ionicons name="call-outline" size={20} color={theme.danger} />
                <AppText style={styles.flex}>{t('sceneTips.emergency')}</AppText>
              </Card>
            )}
            {!hasVoice && voice.voices !== null && <NoVoiceNote lang={lang} />}
            {!settings.tipsSeen.includes('sceneTap') && (
              <AppText variant="caption" center>
                {t('scene.tapHint')}
              </AppText>
            )}
            {mode === 'turn' && (
              <AppText variant="caption" center>
                {t('scene.turnHint')}
              </AppText>
            )}

            {lines.map((p, i) => {
              const you = p.speaker === 'you';
              const hidden = mode === 'turn' && you && !revealed.has(i);
              const active = current === i;
              return (
                <View
                  key={p.key}
                  onLayout={(e) => {
                    ys.current[i] = e.nativeEvent.layout.y;
                  }}
                  style={[styles.lineWrap, you ? styles.right : styles.left]}
                >
                  <AppText variant="label" style={[styles.speaker, you && styles.speakerRight]}>
                    {t(`roles.${p.speaker}`)}
                    {p.register ? ` · ${t(`register.${p.register}`)}` : ''}
                  </AppText>
                  {hidden ? (
                    <HiddenLine
                      phrase={p}
                      waiting={waiting === i}
                      onPress={() => tapLine(i)}
                      slow={settings.speed === 'slow'}
                    />
                  ) : (
                    <Pressy
                      onPress={() => tapLine(i)}
                      depth={0.98}
                      feedback={false}
                      accessibilityLabel={t('scene.lineA11y', {
                        speaker: t(`roles.${p.speaker}`),
                        roman: p.roman,
                        meaning: p.en,
                      })}
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.bubble,
                        you ? styles.bubbleYou : styles.bubbleThem,
                        {
                          backgroundColor: you ? mine.bg : active ? theme.highlight : theme.surface,
                          borderColor: active ? theme.accent : you ? 'transparent' : theme.border,
                        },
                      ]}
                    >
                      <PhraseText
                        phrase={p}
                        size={23}
                        color={you ? mine.fg : undefined}
                        subColor={you ? mine.sub : undefined}
                        bigRoman={!hasVoice}
                      />
                      <View style={styles.bubbleFoot}>
                        <Ionicons
                          name={voice.speaking === p.key ? 'volume-high' : 'volume-medium-outline'}
                          size={16}
                          color={you ? mine.sub : theme.faint}
                        />
                        <Pressy
                          onPress={() => router.push(`/show/${encodeURIComponent(p.key)}`)}
                          accessibilityLabel={t('scene.showA11y')}
                          hitSlop={10}
                          style={styles.expand}
                        >
                          <Ionicons
                            name="expand-outline"
                            size={18}
                            color={you ? mine.sub : theme.faint}
                          />
                        </Pressy>
                      </View>
                    </Pressy>
                  )}
                  {p.note && !hidden && <Note text={p.note} style={styles.note} />}
                </View>
              );
            })}

            {done && (
              <Animated.View
                entering={FadeIn}
                style={[styles.done, { backgroundColor: theme.surfaceRaised }]}
              >
                <Ionicons name="sparkles" size={20} color={theme.accentText} />
                <AppText variant="heading" style={styles.flex}>
                  {done === 'listen' ? t('scene.heardDone') : t('scene.spokeDone')}
                </AppText>
              </Animated.View>
            )}

            <AppText variant="label" style={styles.section}>
              {t('scene.practise')}
            </AppText>
            <View style={styles.pair}>
              <PracticeTile
                icon="mic-outline"
                title={t('scene.sayIt')}
                body={t('scene.sayItBody')}
                onPress={() => router.push(`/say/${sceneId}`)}
              />
              <PracticeTile
                icon="help-buoy-outline"
                title={t('scene.quiz')}
                body={t('scene.quizBody')}
                onPress={() => router.push(`/quiz/${sceneId}`)}
              />
            </View>

            <AppText variant="label" style={styles.section}>
              {t('scene.keyPhrases')}
            </AppText>
            {more.map((p) => (
              <Pressy
                key={p.key}
                feedback={false}
                depth={0.98}
                onPress={() => {
                  stop();
                  if (voice.canHear(p)) voice.say(p);
                  practised([p.key]);
                }}
                accessibilityLabel={t('scene.lineA11y', {
                  speaker: t('roles.you'),
                  roman: p.roman,
                  meaning: p.en,
                })}
                style={[
                  styles.extra,
                  {
                    backgroundColor: voice.speaking === p.key ? theme.highlight : theme.surface,
                    borderColor: voice.speaking === p.key ? theme.accent : theme.border,
                  },
                ]}
              >
                <View style={styles.flex}>
                  <PhraseText phrase={p} size={21} bigRoman={!hasVoice} />
                  {p.note && <Note text={p.note} style={styles.note} />}
                </View>
                <Pressy
                  onPress={() => router.push(`/show/${encodeURIComponent(p.key)}`)}
                  accessibilityLabel={t('scene.showA11y')}
                  hitSlop={8}
                  style={styles.expand}
                >
                  <Ionicons name="expand-outline" size={20} color={theme.faint} />
                </Pressy>
              </Pressy>
            ))}
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
              <Segmented
                options={['listen', 'turn'] as const}
                value={mode}
                label={(m) => (m === 'listen' ? t('scene.listen') : t('scene.yourTurn'))}
                onChange={switchMode}
              />
              <Button
                icon={playing ? 'stop' : 'play'}
                label={
                  playing
                    ? t('scene.stop')
                    : mode === 'listen'
                      ? t('scene.play')
                      : t('scene.playTurn')
                }
                kind={playing ? 'secondary' : 'primary'}
                onPress={() => (playing ? stop() : play(0, mode, new Set()))}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/** Your hidden line in "Your turn": what to say, then a gentle countdown. */
function HiddenLine({
  phrase,
  waiting,
  slow,
  onPress,
}: {
  phrase: Phrase;
  waiting: boolean;
  slow: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(0);
    if (waiting)
      fill.set(withTiming(1, { duration: pauseFor(phrase, slow), easing: Easing.linear }));
  }, [waiting, fill, phrase, slow]);
  const bar = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <Pressy
      onPress={onPress}
      depth={0.98}
      feedback={false}
      accessibilityLabel={t('scene.hiddenLine', { meaning: phrase.en })}
      style={[
        styles.bubble,
        styles.bubbleYou,
        styles.hidden,
        { borderColor: waiting ? theme.accent : theme.teal, backgroundColor: theme.surface },
      ]}
    >
      <AppText variant="heading" color={theme.text}>
        {waiting ? t('scene.sayNow') : t('scene.hiddenLine', { meaning: phrase.en })}
      </AppText>
      {waiting && <AppText variant="caption">{phrase.en}</AppText>}
      {settings.hindiMeanings && phrase.lang !== 'hi' && <HindiText>{phrase.hi}</HindiText>}
      {waiting && (
        <View style={[styles.track, { backgroundColor: theme.track }]}>
          <Animated.View style={[styles.bar, { backgroundColor: theme.accent }, bar]} />
        </View>
      )}
    </Pressy>
  );
}

function PracticeTile({
  icon,
  title,
  body,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={`${title}. ${body}`} style={styles.flex}>
      <Card style={styles.practice}>
        <Ionicons name={icon} size={24} color={theme.accentText} />
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption">{body}</AppText>
      </Card>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  title: { fontSize: 21, lineHeight: 26 },
  speed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  speedText: { fontSize: 14 },
  content: { paddingHorizontal: 16, gap: 10, width: '100%', maxWidth: 640, alignSelf: 'center' },
  tip: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1.5 },
  lineWrap: { maxWidth: '88%', gap: 4 },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  speaker: { marginHorizontal: 6, fontSize: 11 },
  speakerRight: { textAlign: 'right' },
  bubble: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderWidth: 2,
  },
  bubbleThem: { borderTopLeftRadius: 6 },
  bubbleYou: { borderTopRightRadius: 6 },
  bubbleFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  expand: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { borderStyle: 'dashed', gap: 6, minWidth: 220, paddingVertical: 14 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  bar: { height: 6, borderRadius: 3 },
  note: { marginTop: 2 },
  done: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
  },
  section: { marginTop: 14 },
  pair: { flexDirection: 'row', gap: 12 },
  practice: { gap: 4, minHeight: 112 },
  extra: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'flex-start',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderTopWidth: 1,
  },
  footInner: { gap: 10, width: '100%', maxWidth: 608, alignSelf: 'center' },
  lockedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
});
