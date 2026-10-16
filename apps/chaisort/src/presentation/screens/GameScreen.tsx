import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CanvasRef } from '@shopify/react-native-skia';
import { cupThemeById } from '@/domain/entities/CupTheme';
import { INGREDIENTS } from '@/domain/entities/Ingredient';
import { ingOf, ingredientsOf, isHidden, TALL_SIZE, type Level } from '@/domain/entities/Level';
import { pourCue } from '@/domain/ports/Sounds';
import { isServed, legalPours, topRun, type Refusal } from '@/application/engine/state';
import { findHint } from '@/application/game/hint';
import {
  addExtraCup,
  current,
  isWon,
  newGame,
  noteHint,
  pour,
  poursOf,
  restart,
  starsFor,
  undo,
  type Game,
} from '@/application/game/play';
import { dailyLevel, shareText, todayNumber } from '@/application/levels/daily';
import { chapterOf, LEVEL_COUNT, levelFor } from '@/application/levels/levels';
import { reviews, textSharer, imageSharer } from '@/config/container';
import { Counter, CALM_POUR_MS, POUR_MS, type PourAnim } from '../counter/Counter';
import { cupHeightInLayers, layoutCounter } from '../counter/layout';
import { LOOKS } from '../counter/looks';
import { useSharePicture } from '../counter/useSharePicture';
import { HintSheet } from '../components/HintSheet';
import { AppText, Button, IconButton, Pressy } from '../components/Kit';
import { OrderTicket } from '../components/OrderTicket';
import { StallBackdrop } from '../components/StallBackdrop';
import { WinPanel } from '../components/WinPanel';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useRecord } from '../state/RecordProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const CHEERS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const;

/** `/play/12` plays level 12; `/play/d15` plays daily order #15. */
export function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const daily = id?.startsWith('d') ? Number(id.slice(1)) : null;
  const n = daily ?? Number(id);
  const rec = useRecord();
  const ent = useEntitlements();
  const { loaded: settingsLoaded } = useSettings();
  const [built, setBuilt] = useState<{ n: number; level: Level } | null>(null);
  const today = todayNumber(new Date());
  const allowed =
    daily !== null
      ? ent.archiveOpen(daily, today)
      : Number.isInteger(n) && n >= 1 && n <= LEVEL_COUNT && rec.isOpen(n);
  useEffect(() => {
    if (daily === null || !allowed) return;
    // The daily counter is built on the phone from the day's seed; let the screen paint first.
    const timer = setTimeout(() => setBuilt({ n: daily, level: dailyLevel(daily) }), 60);
    return () => clearTimeout(timer);
  }, [daily, allowed]);
  if (!rec.loaded || !settingsLoaded) return <Building />;
  if (!allowed) return <Locked daily={daily !== null} />;
  const level = daily === null ? levelFor(n) : built?.n === daily ? built.level : null;
  if (!level) return <Building />;
  return <Play key={level.id} level={level} number={n} daily={daily !== null} />;
}

function Building() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.screen, styles.centre, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.accent} />
      <AppText variant="caption" center>
        {t('game.building')}
      </AppText>
    </View>
  );
}

function Locked({ daily }: { daily: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[styles.screen, styles.centre, styles.locked, { backgroundColor: theme.background }]}
    >
      <Ionicons name="lock-closed" size={36} color={theme.accentText} />
      <AppText variant="title" center>
        {daily ? t('game.dailyLocked') : t('game.locked')}
      </AppText>
      <AppText variant="body" center color={theme.muted}>
        {daily ? t('game.dailyLockedBody') : t('game.lockedBody')}
      </AppText>
      {daily && (
        <Button
          icon="sparkles"
          label={t('support.buyNoPrice')}
          onPress={() => router.replace('/support')}
        />
      )}
      <Button
        kind="ghost"
        label={t('common.back')}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
    </View>
  );
}

type Note = { readonly text: string; readonly sticky?: boolean } | null;

function Play({ level, number, daily }: { level: Level; number: number; daily: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings, update, haptics, sounds, calmMotion } = useSettings();
  const ent = useEntitlements();
  const rec = useRecord();
  const theme_ = cupThemeById(settings.cups);
  const look = LOOKS[ent.isThemeOpen(theme_) ? theme_.id : 'kulhad'];

  const [game, setGame] = useState<Game>(() => newGame(level));
  const pos = current(game);
  const pours = poursOf(game);
  const won = isWon(game);
  const [selected, setSelected] = useState<number | null>(null);
  const [anim, setAnim] = useState<PourAnim | null>(null);
  const [shake, setShake] = useState<{ cup: number; id: number } | null>(null);
  const [burst, setBurst] = useState<{ cup: number; id: number } | null>(null);
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const counter = useRef<CanvasRef>(null);
  const nextId = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const sharePicture = useSharePicture(
    counter,
    daily ? `daily-${number}` : `level-${number}`,
    theme.background,
  );
  const [canShareImage, setCanShareImage] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let live = true;
    void imageSharer.supported().then((ok) => {
      if (live) setCanShareImage(ok);
    });
    return () => {
      live = false;
    };
  }, []);
  const [lesson, setLesson] = useState(() =>
    level.lesson && !settings.lessonsSeen.includes(level.lesson) ? level.lesson : null,
  );
  const [cheer] = useState(() => CHEERS[(number * 7 + level.best) % CHEERS.length]!);

  useEffect(() => {
    if (!daily) rec.setLast(number);
    // Only on opening the level.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Notes fade on their own unless they matter until the player acts.
  useEffect(() => {
    if (!note || note.sticky) return;
    const timer = setTimeout(() => setNote(null), 2800);
    return () => clearTimeout(timer);
  }, [note]);

  // The stove simmers quietly while you play.
  useEffect(() => {
    sounds.loop(won ? 0 : 0.22);
  }, [won, sounds]);
  useEffect(() => () => sounds.loop(0), [sounds]);

  const ingredients = useMemo(() => ingredientsOf(level), [level]);
  const done = useMemo(() => {
    const set = new Set<number>();
    for (const c of pos.cups) if (isServed(c)) set.add(ingOf(c[0]!));
    return set;
  }, [pos]);
  const served = useMemo(() => pos.cups.map(isServed), [pos]);
  const stuck = !won && legalPours(pos).length === 0;
  const pourMs = calmMotion ? CALM_POUR_MS : POUR_MS;

  // The order is served: the record, then the card.
  useEffect(() => {
    if (!won) return;
    const stars = starsFor(pours, level.par, game.assists);
    if (daily) rec.solveDaily(number, { pours, hints: game.assists, stars });
    else rec.solveLevel(number, stars);
    if (level.lesson && !settings.lessonsSeen.includes(level.lesson)) {
      update({ lessonsSeen: [...settings.lessonsSeen, level.lesson] });
    }
    later(pourMs * 0.8, () => {
      sounds.play('order');
      haptics.delight();
    });
    later(calmMotion ? 700 : pourMs + 1300, () => setPanel(true));
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  // After a genuinely good moment (a clean solve, well into the game), the store's review card, once.
  useEffect(() => {
    if (!panel || settings.reviewAsked || game.assists > 0 || daily || number < 12) return;
    if (starsFor(pours, level.par, game.assists) < 3) return;
    update({ reviewAsked: true });
    const timer = setTimeout(() => void reviews.request(), 2500);
    return () => clearTimeout(timer);
  }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = (ing: number) => t(`ingredients.${INGREDIENTS[ing]?.id ?? 'masala'}`);

  const refuse = (cup: number, why: Refusal) => {
    sounds.play('nope');
    haptics.thump();
    setShake({ cup, id: nextId.current++ });
    if (why === 'same') return;
    const src = selected !== null ? pos.cups[selected] : undefined;
    const run = src ? topRun(src) : null;
    if (why === 'mismatch' && run) {
      setNote({ text: t('game.refuse.mismatch', { what: nameOf(run.ing) }) });
    } else if (why === 'lidFrom' || why === 'lidTo') {
      const at = why === 'lidFrom' ? (selected ?? cup) : cup;
      setNote({ text: t('game.refuse.lidFrom', { count: pos.lids[at] ?? 0 }) });
    } else {
      setNote({ text: t(`game.refuse.${why}`) });
    }
  };

  const onTapCup = (i: number) => {
    if (won) return;
    const cup = pos.cups[i] ?? [];
    if (selected === null) {
      if (cup.length === 0) {
        sounds.play('tap');
        setNote({ text: t('game.refuse.empty') });
        return;
      }
      if ((pos.lids[i] ?? 0) > 0) return refuse(i, 'lidFrom');
      if (isServed(cup)) {
        haptics.tick();
        setNote({ text: t('game.refuse.served') });
        return;
      }
      setSelected(i);
      sounds.play('lift');
      haptics.tick();
      return;
    }
    if (selected === i) {
      setSelected(null);
      sounds.play('tap');
      return;
    }
    const from = selected;
    const r = pour(game, from, i);
    if (!r.ok) {
      setSelected(null);
      refuse(i, r.why);
      return;
    }
    const before = pos;
    const after = current(r.game);
    const id = nextId.current++;
    setAnim({
      id,
      from,
      to: i,
      ing: r.pour.ing,
      amount: r.pour.amount,
      source: before.cups[from] ?? [],
      target: after.cups[i] ?? [],
    });
    later(pourMs + 40, () => setAnim((a) => (a?.id === id ? null : a)));
    setGame(r.game);
    setSelected(null);
    setHint(null);
    if (note?.sticky) setNote(null);
    // Sounds follow the pour: the clink as cups meet, the gurgle as it flows, the ting as it is ready.
    const fill = (after.cups[i]?.length ?? 0) / (after.caps[i] ?? 4);
    if (!calmMotion) later(pourMs * 0.24, () => sounds.play('clink'));
    later(calmMotion ? 0 : pourMs * 0.3, () => {
      sounds.play(pourCue(fill));
      haptics.tap();
    });
    if (isServed(after.cups[i] ?? [])) {
      later(pourMs * 0.8, () => {
        sounds.play('ting');
        haptics.pop();
        setBurst({ cup: i, id: nextId.current++ });
      });
    }
    if (before.lids.some((l, k) => l === 1 && (after.lids[k] ?? 0) === 0)) {
      later(pourMs * 0.85, () => sounds.play('lid'));
    }
  };

  const onUndo = () => {
    if (pours === 0) return;
    setGame((g) => undo(g));
    setAnim(null);
    setSelected(null);
    setHint(null);
    sounds.play('undo');
    haptics.tick();
  };

  const onRestart = () => {
    setGame((g) => restart(g));
    setAnim(null);
    setSelected(null);
    setHint(null);
    setNote(null);
    sounds.play('lift');
    haptics.thump();
  };

  const takeHint = () => {
    const h = findHint(game.history);
    if (h.kind === 'solved') return setNote({ text: t('hints.nothing') });
    if (h.kind === 'restart') return setNote({ text: t('hints.restart'), sticky: true });
    if (!ent.takeHint()) return;
    const rewind = h.kind === 'undo' ? h.at : undefined;
    setGame((g) => noteHint(g, rewind));
    setAnim(null);
    setSelected(h.pour.from);
    setHint({ from: h.pour.from, to: h.pour.to });
    sounds.play('hint');
    haptics.delight();
    setHintOpen(false);
    const words = { from: h.pour.from + 1, to: h.pour.to + 1 };
    setNote({
      text:
        h.kind === 'undo'
          ? t('hints.rewound', { count: game.history.length - 1 - h.at, ...words })
          : t('hints.pourThis', words),
      sticky: true,
    });
  };

  const takeExtraCup = () => {
    const next = addExtraCup(game);
    if (!next) return setNote({ text: t('game.extraUsed') });
    if (!ent.takeHint()) return;
    setGame(next);
    setAnim(null);
    setSelected(null);
    setHint(null);
    setHintOpen(false);
    sounds.play('clink');
    haptics.pop();
    setNote({ text: t('game.extraAdded') });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!area || Math.abs(area.w - width) > 1 || Math.abs(area.h - height) > 1)
      setArea({ w: width, h: height });
  };
  const layout = useMemo(
    () => (area ? layoutCounter(pos.caps, Math.min(area.w, 640), area.h) : null),
    [area, pos.caps],
  );

  const cupLabel = (i: number): string => {
    const cup = pos.cups[i] ?? [];
    const cap = pos.caps[i] ?? 4;
    const parts: string[] = [];
    if (cup.length === 0) parts.push(t('game.cupEmpty'));
    else if (isServed(cup)) parts.push(t('game.cupServed', { what: nameOf(ingOf(cup[0]!)) }));
    else {
      const names = cup.map((l) => (isHidden(l) ? t('game.hidden') : nameOf(ingOf(l))));
      parts.push(t('game.cupLayers', { layers: names.join(', '), top: names[names.length - 1] }));
      parts.push(
        cup.length < cap ? t('game.cupRoom', { count: cap - cup.length }) : t('game.cupFull'),
      );
    }
    if (cap === TALL_SIZE) parts.push(t('game.cupTall'));
    if ((pos.lids[i] ?? 0) > 0) parts.push(t('game.cupLid', { count: pos.lids[i] }));
    if (selected === i) parts.push(t('game.cupSelected'));
    return t('game.cupA11y', { n: i + 1, what: parts.join('; ') });
  };

  const title = daily ? t('game.daily', { n: number }) : t('game.level', { n: number });
  const subtitle = daily
    ? t('daily.title')
    : t(`chapters.c${chapterOf(number) + 1}` as 'chapters.c1');
  const stars = starsFor(pours, level.par, game.assists);

  const share = async () => {
    const text = shareText(number, pours, game.assists, {
      name: t('app.name'),
      pours: (k) => t('win.sharePours', { count: k }),
      noHints: t('win.noHints'),
      hints: (k) => t('win.hintCount', { count: k }),
    });
    const result = await textSharer.shareText(text);
    if (result === 'copied') setNote({ text: t('win.copied') });
  };

  // When the win card rises, the served counter slides up to stay in view.
  // It only uses the free space above the cups (and their steam), never covering the ticket.
  const rise = useSharedValue(0);
  const headroom = layout
    ? Math.min(...layout.slots.map((s) => s.base - (cupHeightInLayers(s.cap) + 2) * layout.lh))
    : 0;
  useEffect(() => {
    const lift = panel && area ? Math.max(0, Math.min(area.h * 0.32, 240, headroom)) : 0;
    rise.set(withTiming(-lift, { duration: calmMotion ? 0 : 500 }));
  }, [panel, area, rise, calmMotion, headroom]);
  const riseStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rise.get() }] }));

  const shown: Note = stuck && !note ? { text: t('game.stuck'), sticky: true } : note;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <StallBackdrop />
      <View style={[styles.column, { paddingTop: insets.top + 30 }]}>
        <View style={styles.topBar}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <View style={styles.titles}>
            <AppText variant="heading" center accessibilityRole="header">
              {title}
            </AppText>
            <AppText variant="caption" center numberOfLines={1}>
              {subtitle}
            </AppText>
          </View>
          <IconButton
            icon="refresh"
            label={t('game.restart')}
            disabled={won || pours === 0}
            onPress={onRestart}
          />
        </View>

        <View style={styles.ticketWrap}>
          <OrderTicket ingredients={ingredients} done={done} won={won} symbols={settings.symbols} />
        </View>

        {lesson && !won ? (
          <Animated.View
            entering={calmMotion ? undefined : FadeInDown.springify().damping(18)}
            style={[
              styles.lesson,
              { backgroundColor: theme.glass, borderColor: theme.glassBorder },
            ]}
          >
            <View style={[styles.lessonBadge, { backgroundColor: theme.accent }]}>
              <Ionicons name="cafe" size={14} color={theme.onAccent} />
            </View>
            <AppText variant="body" style={styles.flex}>
              {t(`lessons.${lesson}`)}
            </AppText>
            <Pressy
              onPress={() => {
                setLesson(null);
                if (!settings.lessonsSeen.includes(lesson))
                  update({ lessonsSeen: [...settings.lessonsSeen, lesson] });
              }}
              accessibilityLabel={t('lessons.gotIt')}
              style={styles.gotIt}
              hitSlop={8}
            >
              <AppText variant="label" color={theme.accentText}>
                {t('lessons.gotIt')}
              </AppText>
            </Pressy>
          </Animated.View>
        ) : null}

        <Animated.View style={[styles.play, riseStyle]} onLayout={onLayout}>
          {layout && (
            <Counter
              ref={counter}
              pos={pos}
              layout={layout}
              look={look}
              palette={theme}
              symbols={settings.symbols}
              calm={calmMotion}
              selected={won ? null : selected}
              hint={won ? null : hint}
              anim={anim}
              shake={shake}
              burst={burst}
              served={served}
              label={cupLabel}
              readyText={won ? t('game.orderUp') : t('game.ready')}
              onTapCup={onTapCup}
              onTapCounter={() => {
                if (selected !== null) {
                  setSelected(null);
                  sounds.play('tap');
                }
              }}
            />
          )}
          {shown && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(220)}
              style={[
                styles.note,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
              pointerEvents="none"
            >
              <AppText variant="body" color={theme.text} center accessibilityLiveRegion="polite">
                {shown.text}
              </AppText>
            </Animated.View>
          )}
        </Animated.View>

        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
          <IconButton
            icon="arrow-undo"
            label={t('game.undo')}
            disabled={won || pours === 0}
            onPress={onUndo}
          />
          <View style={styles.counterText}>
            <AppText variant="heading" center>
              {t('game.pours', { count: pours })}
            </AppText>
            <AppText variant="caption" center>
              {t('game.par', { par: level.par })}
            </AppText>
          </View>
          <View>
            <IconButton
              icon="bulb"
              label={t('game.hint')}
              disabled={won}
              tint={theme.accentText}
              onPress={() => {
                setHintOpen(true);
                if (ent.hintsLeft() === 0) ent.warmAds();
              }}
            />
            <View style={[styles.badge, { backgroundColor: theme.accent }]} pointerEvents="none">
              <AppText variant="label" color={theme.onAccent} style={styles.badgeText}>
                {ent.plus ? '∞' : String(ent.hintsLeft())}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <HintSheet
        visible={hintOpen}
        onClose={() => setHintOpen(false)}
        onHint={takeHint}
        onExtraCup={game.extra ? undefined : takeExtraCup}
      />

      {panel && (
        <WinPanel
          title={daily ? t('win.dailyTitle', { n: number }) : t('win.title')}
          cheer={t(`win.cheers.${cheer}`)}
          stars={stars}
          pours={pours}
          par={level.par}
          hints={game.assists}
          streak={daily && number === todayNumber(new Date()) ? rec.streak : null}
          last={!daily && number === LEVEL_COUNT}
          onNext={
            daily
              ? undefined
              : number < LEVEL_COUNT
                ? () =>
                    router.replace({ pathname: '/play/[id]', params: { id: String(number + 1) } })
                : undefined
          }
          onShareText={daily ? () => void share() : undefined}
          onShareImage={
            canShareImage ? () => void sharePicture().catch(() => undefined) : undefined
          }
          onReplay={() =>
            router.replace({
              pathname: '/play/[id]',
              params: { id: daily ? `d${number}` : String(number) },
            })
          }
          onLevels={() => router.replace(daily ? '/daily' : '/levels')}
          levelsLabel={daily ? t('daily.archive') : t('win.levels')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  centre: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  locked: { paddingHorizontal: 32 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  titles: { flex: 1 },
  ticketWrap: { paddingHorizontal: 14, marginTop: 8 },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 8,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  lessonBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotIt: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  play: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: {
    position: 'absolute',
    bottom: 4,
    left: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    maxWidth: 520,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  counterText: { flex: 1, alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, letterSpacing: 0 },
});
