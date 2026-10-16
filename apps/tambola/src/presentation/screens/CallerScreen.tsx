import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MAX_CALL_SECONDS, MIN_CALL_SECONDS, type CallMode } from '@/domain/entities/Settings';
import { HIGHEST } from '@/domain/entities/Ticket';
import { callOrder } from '@/application/calling';
import { decodeRoom } from '@/application/room';
import { hindiWord } from '@/application/voice';
import { Ball, RollingBall } from '../caller/Ball';
import { Board } from '../caller/Board';
import { FestiveBackdrop } from '../components/Festive';
import {
  AppText,
  Button,
  Card,
  IconButton,
  Pressy,
  Segmented,
  Sheet,
  Stepper,
} from '../components/Kit';
import { funKey } from '../i18n/en';
import { useGame } from '../state/GameProvider';
import { useAnnouncer } from '../state/hooks';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const KEEP_AWAKE = 'tambola-caller';

export function CallerScreen() {
  const { host } = useGame();
  // Ending the game on purpose goes to the results; a missing game goes home.
  const ending = useRef(false);
  useEffect(() => {
    if (!host && !ending.current) router.replace('/');
  }, [host]);
  if (!host) return null;
  return <Caller onEnding={() => (ending.current = true)} />;
}

function Caller({ onEnding }: { onEnding: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { host, hostCall, hostEnd } = useGame();
  const { settings, update, seeHint } = useSettings();
  const announcer = useAnnouncer();
  const [runningWanted, setRunning] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [copied, setCopied] = useState(false);
  const session = host!;
  const room = useMemo(() => decodeRoom(session.code), [session.code]);
  const order = useMemo(() => (room ? callOrder(room.seed) : []), [room]);
  const called = session.called;
  const current = called > 0 ? order[called - 1]! : null;
  const previous = order.slice(Math.max(0, called - 6), Math.max(0, called - 1)).reverse();
  const calledNumbers = useMemo(() => new Set(order.slice(0, called)), [order, called]);
  const over = session.wins.some((w) => w.prize === 'full');
  const finished = over || called >= HIGHEST;
  const auto = settings.callMode === 'auto';
  const running = runningWanted && !finished;

  // The screen stays on while this phone is the caller.
  useFocusEffect(
    useCallback(() => {
      void activateKeepAwakeAsync(KEEP_AWAKE).catch(() => undefined);
      return () => {
        // Checking a claim (or leaving) pauses the auto-caller.
        setRunning(false);
        void deactivateKeepAwake(KEEP_AWAKE).catch(() => undefined);
      };
    }, []),
  );

  const callNext = useCallback(() => {
    if (called >= HIGHEST || over) return;
    const n = order[called];
    if (n === undefined) return;
    hostCall();
    announcer.call(n);
  }, [called, over, order, hostCall, announcer]);

  // Auto-call: the next number after `callSeconds`, while running.
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!running || !auto || finished) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    const ms = settings.callSeconds * 1000;
    progress.set(0);
    progress.set(withTiming(1, { duration: ms, easing: Easing.linear }));
    const timer = setTimeout(callNext, ms);
    return () => clearTimeout(timer);
  }, [running, auto, finished, called, settings.callSeconds, callNext, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  const invite = () => {
    const link = `tambola://join/${session.code}`;
    void Share.share({
      title: t('caller.inviteTitle'),
      message: t('caller.inviteMessage', { code: session.code, link }),
    }).catch(() => undefined);
  };
  const copy = () => {
    void Clipboard.setStringAsync(session.code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => undefined);
  };
  const end = () => {
    setConfirmEnd(false);
    announcer.hush();
    onEnding();
    hostEnd();
    router.replace('/results');
  };
  const start = () => {
    seeHint('caller');
    callNext();
    if (auto) setRunning(true);
  };

  const ballSize = Math.min(188, width * 0.44);
  const rhyme = current && settings.funCalls ? t(funKey(current)) : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <FestiveBackdrop lights={false} />
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.topBar}>
          <IconButton icon="close" label={t('caller.end')} onPress={() => setConfirmEnd(true)} />
          <Pressy
            onPress={copy}
            accessibilityLabel={`${t('caller.room')} ${session.code.split('').join(' ')}. ${t('caller.copy')}`}
            style={[
              styles.roomChip,
              { backgroundColor: theme.glass, borderColor: theme.glassBorder },
            ]}
          >
            <AppText variant="label">{copied ? t('caller.copied') : t('caller.room')}</AppText>
            <Text
              style={[styles.roomCode, { color: theme.accentText }]}
              maxFontSizeMultiplier={1.3}
            >
              {session.code}
            </Text>
          </Pressy>
          <Button
            compact
            kind="second"
            icon="share-social"
            label={t('caller.invite')}
            accessibilityLabel={t('caller.inviteA11y', { code: session.code })}
            onPress={invite}
          />
        </View>

        {called === 0 ? (
          <Card style={styles.waiting}>
            <AppText variant="label" center>
              {t('caller.waitingTitle')}
            </AppText>
            <View
              style={styles.bigCode}
              accessible
              accessibilityLabel={session.code.split('').join(' ')}
            >
              {session.code.split('').map((ch, i) => (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    { backgroundColor: theme.surfaceRaised, borderColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[styles.codeChar, { color: theme.text }]}
                    maxFontSizeMultiplier={1.2}
                  >
                    {ch}
                  </Text>
                </View>
              ))}
            </View>
            <AppText variant="body" center color={theme.muted}>
              {t('caller.waitingBody')}
            </AppText>
            <Button big icon="play" label={t('caller.start')} onPress={start} />
          </Card>
        ) : (
          <Card style={styles.stage}>
            <View style={styles.stageHead}>
              <AppText variant="label">{t('caller.calledOf', { count: called })}</AppText>
              {!settings.hintsSeen.includes('callerTip') && auto && (
                <Pressy
                  onPress={() => seeHint('callerTip')}
                  accessibilityLabel={t('common.close')}
                  feedback={false}
                >
                  <AppText variant="caption" style={styles.tip}>
                    {t('caller.hint')} ✕
                  </AppText>
                </Pressy>
              )}
            </View>
            <View
              style={[styles.ballWrap, { height: ballSize + 8 }]}
              accessible
              accessibilityLiveRegion="assertive"
              accessibilityLabel={
                current
                  ? `${t('caller.numberA11y', { n: current })}${rhyme ? `. ${rhyme}` : ''}`
                  : ''
              }
            >
              <RollingBall n={current} size={ballSize} distance={width * 0.6} />
            </View>
            {rhyme ? (
              <AppText variant="display" center color={theme.accentText} style={styles.rhyme}>
                {rhyme}
              </AppText>
            ) : null}
            {current && settings.voice && settings.voiceLanguage === 'hi' ? (
              <Text style={[styles.hindi, { color: theme.text }]} maxFontSizeMultiplier={1.5}>
                {hindiWord(current)}
              </Text>
            ) : null}
            {previous.length > 0 && (
              <View style={styles.lastRow}>
                <AppText variant="label">{t('caller.lastCalls')}</AppText>
                <View style={styles.lastBalls}>
                  {previous.map((n) => (
                    <Ball key={n} n={n} size={44} />
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {called > 0 && !finished && (
          <View style={styles.controls}>
            {auto ? (
              <>
                <Button
                  big
                  icon={running ? 'pause' : 'play'}
                  kind={running ? 'secondary' : 'primary'}
                  label={running ? t('caller.pause') : t('caller.resume')}
                  onPress={() => setRunning((r) => !r)}
                />
                <View style={[styles.track, { backgroundColor: theme.surfaceRaised }]}>
                  <Animated.View style={[styles.fill, { backgroundColor: theme.accent }, bar]} />
                </View>
              </>
            ) : (
              <Button big icon="arrow-forward-circle" label={t('caller.next')} onPress={callNext} />
            )}
          </View>
        )}

        {finished && (
          <Card style={[styles.overCard, { borderColor: theme.accent }]}>
            <Ionicons name="trophy" size={34} color={theme.accentText} />
            <AppText variant="title" center>
              {over ? t('caller.over') : t('caller.allCalled')}
            </AppText>
            <Button icon="ribbon" label={t('caller.results')} onPress={end} />
          </Card>
        )}

        {called > 0 && (
          <View style={styles.checkWrap}>
            <Button
              big
              kind="second"
              icon="checkmark-done-circle"
              label={t('caller.checkClaim')}
              onPress={() => router.push('/host/check')}
            />
            <AppText variant="caption" center>
              {t('caller.checkHint')}
            </AppText>
          </View>
        )}

        {session.wins.length > 0 && (
          <Card style={styles.wins}>
            <AppText variant="label">{t('caller.winners')}</AppText>
            {session.wins.map((w, i) => (
              <View key={i} style={styles.winRow}>
                <Ionicons name="ribbon" size={18} color={theme.accentText} />
                <AppText variant="body" style={styles.flex}>
                  {t('caller.won', {
                    prize: t(`prizes.${w.prize}`),
                    who: w.name ? `${w.name} (${w.ticket})` : w.ticket,
                  })}
                </AppText>
              </View>
            ))}
          </Card>
        )}

        {called > 0 && !finished && (
          <Card style={styles.settingsCard}>
            <Segmented<CallMode>
              label={t('caller.mode')}
              value={settings.callMode}
              onChange={(callMode) => {
                update({ callMode });
                if (callMode === 'tap') setRunning(false);
              }}
              options={[
                { value: 'auto', label: t('host.auto') },
                { value: 'tap', label: t('host.tap') },
              ]}
            />
            {auto && (
              <View style={styles.speedRow}>
                <AppText variant="body" style={styles.flex}>
                  {t('host.every')}
                </AppText>
                <Stepper
                  label={t('caller.speed')}
                  value={settings.callSeconds}
                  min={MIN_CALL_SECONDS}
                  max={MAX_CALL_SECONDS}
                  onChange={(callSeconds) => update({ callSeconds })}
                  format={(v) => t('host.secondsShort', { count: v })}
                />
              </View>
            )}
          </Card>
        )}

        <Card style={styles.boardCard}>
          <AppText variant="label">{t('caller.board')}</AppText>
          <Board called={calledNumbers} current={current} />
        </Card>
      </Animated.ScrollView>

      <Sheet visible={confirmEnd} onClose={() => setConfirmEnd(false)} title={t('caller.endTitle')}>
        <AppText variant="body" color={theme.muted}>
          {t('caller.endBody')}
        </AppText>
        <Button icon="flag" label={t('caller.endConfirm')} onPress={end} />
        <Button
          kind="secondary"
          label={t('caller.keepPlaying')}
          onPress={() => setConfirmEnd(false)}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roomChip: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  roomCode: { fontFamily: FONTS.displayBold, fontSize: 24, lineHeight: 28, letterSpacing: 3 },
  waiting: { gap: 16, alignItems: 'stretch', paddingVertical: 24 },
  bigCode: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  codeBox: {
    width: 48,
    height: 62,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: { fontFamily: FONTS.displayBold, fontSize: 34, lineHeight: 40 },
  stage: { gap: 10, alignItems: 'center', paddingTop: 14 },
  stageHead: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tip: { maxWidth: 220, textAlign: 'right' },
  ballWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  rhyme: { marginTop: 2 },
  hindi: { fontFamily: FONTS.hindi, fontSize: 30, lineHeight: 44 },
  lastRow: { alignSelf: 'stretch', gap: 8, marginTop: 6, alignItems: 'center' },
  lastBalls: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  controls: { gap: 10 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  overCard: { alignItems: 'center', gap: 12, borderWidth: 2 },
  checkWrap: { gap: 6 },
  wins: { gap: 10 },
  winRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingsCard: { gap: 12 },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardCard: { gap: 12 },
  flex: { flex: 1 },
});
