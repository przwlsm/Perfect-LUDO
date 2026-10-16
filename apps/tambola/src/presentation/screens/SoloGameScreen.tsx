import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isLight, mix } from 'app-kit';
import { ALL_PRIZES, type PrizeId } from '@/domain/entities/Prize';
import type { ResultRow } from '@/domain/entities/Session';
import { clampCallSeconds } from '@/domain/entities/Settings';
import {
  advance,
  claimPrize,
  createSolo,
  planBotClaims,
  SOLO_START,
  type SoloSetup,
  type SoloState,
} from '@/application/solo';
import { Ball, RollingBall } from '../caller/Ball';
import { FestiveBackdrop } from '../components/Festive';
import { AppText, Button, IconButton, Pressy, Sheet } from '../components/Kit';
import { Confetti } from '../effects/Confetti';
import { funKey } from '../i18n/en';
import { useGame } from '../state/GameProvider';
import { useAnnouncer, useLooks } from '../state/hooks';
import { useSettings } from '../state/SettingsProvider';
import { TicketView } from '../ticket/TicketView';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const TICK_MS = 100;
const KEEP_AWAKE = 'tambola-solo';

function num(v: string | string[] | undefined, fallback: number): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : fallback;
}

export function SoloGameScreen() {
  const params = useLocalSearchParams<{
    seed?: string;
    tickets?: string;
    rivals?: string;
    speed?: string;
  }>();
  const options = useMemo(
    () => ({
      seed: num(params.seed, 1),
      tickets: Math.min(4, Math.max(1, num(params.tickets, 2))),
      rivals: Math.min(5, Math.max(3, num(params.rivals, 4))),
      speed: clampCallSeconds(num(params.speed, 6)),
    }),
    [params.seed, params.tickets, params.rivals, params.speed],
  );
  const setup = useMemo(
    () =>
      createSolo(options.seed, {
        tickets: options.tickets,
        rivals: options.rivals,
        prizes: ALL_PRIZES,
        intervalMs: options.speed * 1000,
      }),
    [options],
  );
  return <SoloGame key={options.seed} setup={setup} options={options} />;
}

interface Toast {
  readonly id: number;
  readonly text: string;
  readonly tone: 'good' | 'bad' | 'info';
}

function SoloGame({
  setup,
  options,
}: {
  setup: SoloSetup;
  options: { tickets: number; rivals: number; speed: number };
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings, sounds, haptics } = useSettings();
  const { look, dabber } = useLooks();
  const { setResult } = useGame();
  const announcer = useAnnouncer();
  const plan = useMemo(() => planBotClaims(setup), [setup]);
  const [state, setState] = useState<SoloState>(SOLO_START);
  const latest = useRef(state);
  const [paused, setPaused] = useState(false);
  const [daubs, setDaubs] = useState<ReadonlySet<number>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [burst, setBurst] = useState(0);
  const [shake, setShake] = useState<{ prize: PrizeId; n: number } | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const toastId = useRef(0);

  const say = useCallback((text: string, tone: Toast['tone']) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, tone });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const finish = useCallback(
    (final: SoloState) => {
      const rows: ResultRow[] = setup.prizes.map((prize) => {
        const w = final.winners[prize];
        return {
          prize,
          winner: !w ? null : w.kind === 'you' ? t('results.you') : setup.bots[w.bot]!.name,
          you: w?.kind === 'you',
          bogus: final.forfeited.includes(prize),
        };
      });
      setResult({ mode: 'solo', rows, calls: final.called, replay: options });
      router.replace('/results');
    },
    [setup, t, setResult, options],
  );

  // Keep the screen on while playing; leaving the screen pauses the game.
  useFocusEffect(
    useCallback(() => {
      void activateKeepAwakeAsync(KEEP_AWAKE).catch(() => undefined);
      return () => {
        setPaused(true);
        void deactivateKeepAwake(KEEP_AWAKE).catch(() => undefined);
      };
    }, []),
  );

  // The game clock: runs while not paused, calling balls and letting rivals claim.
  useEffect(() => {
    if (paused || state.over) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(1000, now - last);
      last = now;
      const step = advance(setup, plan, latest.current, dt);
      latest.current = step.state;
      setState(step.state);
      for (const e of step.events) {
        if (e.kind === 'call') announcer.call(e.number);
        else if (e.kind === 'botWin') {
          sounds.play('undab');
          haptics.thump();
          say(
            t('solo.botWon', { name: setup.bots[e.bot]!.name, prize: t(`prizes.${e.prize}`) }),
            'info',
          );
        }
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused, state.over, setup, plan, announcer, sounds, haptics, say, t]);

  // A short pause on the final moment, then the results.
  useEffect(() => {
    if (!state.over) return;
    const timer = setTimeout(() => finish(latest.current), 2200);
    return () => clearTimeout(timer);
  }, [state.over, finish]);

  const claim = (prize: PrizeId) => {
    const r = claimPrize(setup, latest.current, prize);
    if (r.outcome === 'taken' || r.outcome === 'forfeited') {
      say(
        t(r.outcome === 'taken' ? 'solo.taken' : 'solo.forfeited', { prize: t(`prizes.${prize}`) }),
        'info',
      );
      return;
    }
    latest.current = r.state;
    setState(r.state);
    if (r.outcome === 'won') {
      sounds.play('cheer');
      haptics.delight();
      setBurst((b) => b + 1);
      say(t('solo.youWon', { prize: t(`prizes.${prize}`) }), 'good');
    } else {
      sounds.play('bogus');
      haptics.thump();
      setShake((s) => ({ prize, n: (s?.n ?? 0) + 1 }));
      say(t('solo.bogus', { prize: t(`prizes.${prize}`) }), 'bad');
    }
  };

  const daubsRef = useRef(daubs);
  const onDaub = useCallback(
    (n: number) => {
      const next = new Set(daubsRef.current);
      if (next.has(n)) {
        next.delete(n);
        sounds.play('undab');
        haptics.tick();
      } else {
        next.add(n);
        sounds.play('dab');
        haptics.tap();
      }
      daubsRef.current = next;
      setDaubs(next);
    },
    [sounds, haptics],
  );

  const current = state.called > 0 ? setup.order[state.called - 1]! : null;
  const previous = setup.order
    .slice(Math.max(0, state.called - 5), Math.max(0, state.called - 1))
    .reverse();
  const rhyme = current && settings.funCalls ? t(funKey(current)) : null;
  const wins = (bot: number) =>
    setup.prizes.filter((p) => {
      const w = state.winners[p];
      return w?.kind === 'bot' && w.bot === bot;
    }).length;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <FestiveBackdrop lights={false} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.topBar}>
          <IconButton icon="close" label={t('solo.quit')} onPress={() => setConfirmQuit(true)} />
          <View style={styles.flex}>
            <AppText variant="label" center>
              {state.called === 0
                ? t('solo.getReady')
                : t('caller.calledOf', { count: state.called })}
            </AppText>
          </View>
          <IconButton
            icon={paused ? 'play' : 'pause'}
            label={paused ? t('solo.resume') : t('solo.pause')}
            active={paused}
            onPress={() => setPaused((p) => !p)}
          />
        </View>

        <View
          style={[styles.stage, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
        >
          <View
            style={styles.ballWrap}
            accessible
            accessibilityLiveRegion="assertive"
            accessibilityLabel={
              current ? t('caller.numberA11y', { n: current }) : t('solo.getReady')
            }
          >
            <RollingBall n={current} size={112} distance={width * 0.5} placeholder="?" />
          </View>
          <View style={styles.stageText}>
            {rhyme ? (
              <AppText variant="title" color={theme.accentText} numberOfLines={2}>
                {rhyme}
              </AppText>
            ) : (
              <AppText variant="title">{state.called === 0 ? t('solo.getReady') : ''}</AppText>
            )}
            <View style={styles.lastBalls}>
              {previous.map((n) => (
                <Ball key={n} n={n} size={34} />
              ))}
            </View>
          </View>
          {paused && (
            <View style={[styles.pausedVeil, { backgroundColor: theme.scrim }]}>
              <AppText variant="display" color="#ffffff">
                {t('solo.paused')}
              </AppText>
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rivals}
        >
          {setup.bots.map((bot, i) => (
            <View
              key={bot.name}
              style={[
                styles.rival,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
              accessible
              accessibilityLabel={t('solo.rivalsA11y', { name: bot.name, count: wins(i) })}
            >
              <View
                style={[styles.avatar, { backgroundColor: theme.bulbs[i % theme.bulbs.length] }]}
              >
                <Text style={styles.avatarText}>{bot.name.charAt(0)}</Text>
              </View>
              <AppText variant="heading" style={styles.rivalName}>
                {bot.name}
              </AppText>
              {wins(i) > 0 && (
                <View style={styles.trophies}>
                  <Ionicons name="trophy" size={14} color={theme.accentText} />
                  <AppText variant="heading" color={theme.accentText} style={styles.rivalName}>
                    {wins(i)}
                  </AppText>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View>
          <AppText variant="label" style={styles.claimLabel}>
            {t('solo.claimBar')}
          </AppText>
          <View style={styles.claims}>
            {setup.prizes.map((p) => (
              <PrizeButton
                key={p}
                prize={p}
                state={state}
                botName={(b) => setup.bots[b]!.name}
                shake={shake?.prize === p ? shake.n : 0}
                onPress={() => claim(p)}
              />
            ))}
          </View>
        </View>

        {state.called === 0 && (
          <AppText variant="caption" center>
            {t('solo.hint')}
          </AppText>
        )}

        {setup.player.map((grid, i) => (
          <TicketView
            key={i}
            grid={grid}
            label={t('play.ticket', { id: String(i + 1) })}
            look={look}
            dabber={dabber}
            daubed={daubs}
            onDaub={onDaub}
          />
        ))}
      </ScrollView>

      {toast && (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.springify().damping(16)}
          exiting={FadeOutDown}
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 20,
              backgroundColor:
                toast.tone === 'good'
                  ? theme.accent
                  : toast.tone === 'bad'
                    ? theme.danger
                    : theme.surfaceRaised,
              borderColor: theme.glassBorder,
            },
            styles.noTouch,
          ]}
          accessibilityLiveRegion="polite"
        >
          <AppText
            variant="heading"
            center
            color={
              toast.tone === 'good'
                ? theme.onAccent
                : toast.tone === 'bad'
                  ? isLight(theme.danger)
                    ? '#2a0716'
                    : '#ffffff'
                  : theme.text
            }
          >
            {toast.text}
          </AppText>
        </Animated.View>
      )}

      <Confetti burst={burst} />

      <Sheet
        visible={confirmQuit}
        onClose={() => setConfirmQuit(false)}
        title={t('solo.quitTitle')}
      >
        <AppText variant="body" color={theme.muted}>
          {t('solo.quitBody')}
        </AppText>
        <Button
          icon="flag"
          label={t('solo.quit')}
          onPress={() => {
            setConfirmQuit(false);
            announcer.hush();
            finish(latest.current);
          }}
        />
        <Button
          kind="secondary"
          label={t('caller.keepPlaying')}
          onPress={() => setConfirmQuit(false)}
        />
      </Sheet>
    </View>
  );
}

function PrizeButton({
  prize,
  state,
  botName,
  shake,
  onPress,
}: {
  prize: PrizeId;
  state: SoloState;
  botName: (bot: number) => string;
  shake: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { calmMotion } = useSettings();
  const x = useSharedValue(0);
  useEffect(() => {
    if (shake <= 0 || calmMotion) return;
    x.set(
      withSequence(
        withTiming(-9, { duration: 55 }),
        withTiming(8, { duration: 70 }),
        withTiming(-6, { duration: 70 }),
        withSpring(0, { damping: 7, stiffness: 320 }),
      ),
    );
  }, [shake, calmMotion, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const w = state.winners[prize];
  const lost = state.forfeited.includes(prize);
  const open = !w && !lost;
  const mine = w?.kind === 'you';
  const bg = mine ? theme.accent : open ? theme.second : theme.surfaceRaised;
  const fg = mine ? theme.onAccent : open ? theme.onSecond : theme.muted;
  const status = mine
    ? t('solo.status.you')
    : w?.kind === 'bot'
      ? botName(w.bot)
      : lost
        ? t('solo.status.lost')
        : t('solo.status.open');
  return (
    <Animated.View style={[styles.prizeCell, style]}>
      <Pressy
        onPress={open ? onPress : undefined}
        disabled={!open}
        accessibilityLabel={`${t('solo.claimA11y', { prize: t(`prizes.${prize}`) })}. ${status}`}
        accessibilityState={{ disabled: !open }}
        style={[
          styles.prize,
          {
            backgroundColor: bg,
            borderBottomColor: open || mine ? mix(bg, '#000000', 0.28) : theme.border,
          },
        ]}
      >
        <AppText variant="heading" color={fg} center numberOfLines={1} style={styles.prizeName}>
          {t(`prizes.${prize}`)}
        </AppText>
        <View style={styles.prizeStatus}>
          {mine && <Ionicons name="trophy" size={13} color={fg} />}
          {lost && !w && <Ionicons name="close-circle" size={13} color={theme.danger} />}
          <AppText
            variant="caption"
            color={lost && !w ? theme.danger : fg}
            numberOfLines={1}
            style={[styles.prizeStatusText, !open && !mine && w ? styles.strike : null]}
          >
            {status}
          </AppText>
        </View>
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  noTouch: { pointerEvents: 'none' },
  screen: { flex: 1 },
  content: { paddingHorizontal: 12, gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  flex: { flex: 1 },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 26,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
    minHeight: 136,
  },
  ballWrap: { width: 112, height: 112 },
  stageText: { flex: 1, gap: 8 },
  lastBalls: { flexDirection: 'row', gap: 6 },
  pausedVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rivals: { gap: 8, paddingHorizontal: 2 },
  rival: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    paddingLeft: 4,
    paddingRight: 12,
    minHeight: 44,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FONTS.displayBold, fontSize: 17, color: '#2a1238' },
  rivalName: { fontSize: 15 },
  trophies: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  claimLabel: { marginBottom: 6, marginLeft: 4 },
  claims: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prizeCell: { flexBasis: '31%', flexGrow: 1 },
  prize: {
    minHeight: 58,
    borderRadius: 18,
    borderBottomWidth: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeName: { fontSize: 15, lineHeight: 20 },
  prizeStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  prizeStatusText: { fontSize: 12.5, lineHeight: 16 },
  strike: { textDecorationLine: 'none' },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 560,
    alignSelf: 'center',
  },
});
