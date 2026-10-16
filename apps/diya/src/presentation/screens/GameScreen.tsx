import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CanvasRef } from '@shopify/react-native-skia';
import { colourOf, kindOf, type Level, type PieceKind } from '@/domain/entities/Board';
import { festivalById } from '@/domain/entities/Festival';
import { LIGHT_CUES } from '@/domain/ports/Sounds';
import { applyHint, findHint } from '@/application/game/hint';
import {
  commit,
  evaluate,
  historyOf,
  isFree,
  lift,
  move,
  place,
  redo,
  rotate,
  startState,
  starsFor,
  trayLeft,
  undo,
  type History,
  type PlayState,
} from '@/application/game/play';
import { clock, dailyLevel, shareText, todayNumber } from '@/application/levels/daily';
import { chapterOf, LEVEL_COUNT, levelFor } from '@/application/levels/levels';
import { imageSharer, reviews, textSharer } from '@/config/container';
import { GameBoard } from '../board/GameBoard';
import { layoutBoard } from '../board/layout';
import { useSharePicture } from '../board/useSharePicture';
import { AppText, Button, IconButton, Pressy } from '../components/Kit';
import { HintSheet } from '../components/HintSheet';
import { CHAPTER_KEYS } from '../components/chapters';
import { WinPanel } from '../components/WinPanel';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useRecord } from '../state/RecordProvider';
import { useSettings } from '../state/SettingsProvider';
import { LOOKS } from '../theme/festivals';
import { useTheme } from '../theme/ThemeProvider';

/** `/play/12` plays level 12; `/play/d15` plays daily puzzle #15. */
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
    // The daily board is built on the phone from the day's seed; let the screen paint first.
    const timer = setTimeout(() => setBuilt({ n: daily, level: dailyLevel(daily) }), 60);
    return () => clearTimeout(timer);
  }, [daily, allowed]);
  if (!rec.loaded || !settingsLoaded) return <Building />;
  if (!allowed) return <Locked daily={daily !== null} />;
  const level = daily === null ? levelFor(n) : built?.n === daily ? built.level : null;
  if (!level) return <Building />;
  return <Game key={level.id} level={level} number={n} daily={daily !== null} />;
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

interface GameProps {
  readonly level: Level;
  readonly number: number;
  readonly daily: boolean;
}

function Game({ level, number, daily }: GameProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings, update, haptics, sounds, calmMotion } = useSettings();
  const ent = useEntitlements();
  const rec = useRecord();
  const festival = festivalById(settings.festival);
  const look = LOOKS[ent.isFestivalOpen(festival) ? festival.id : 'diwali'];

  const [history, setHistory] = useState<History>(() => historyOf(startState(level)));
  const state = history.present;
  const evaluation = useMemo(() => evaluate(level, state), [level, state]);
  const left = useMemo(() => trayLeft(level, state), [level, state]);
  const [selected, setSelected] = useState<PieceKind | null>(null);
  const [hints, setHints] = useState(0);
  const won = evaluation.solved;
  const [panel, setPanel] = useState<{ seconds: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [started] = useState(() => Date.now());
  const [seconds, setSeconds] = useState(0);
  const canvas = useRef<CanvasRef>(null);
  const sharePicture = useSharePicture(canvas, daily ? `daily-${number}` : `level-${number}`);
  const [canShareImage, setCanShareImage] = useState(false);
  useEffect(() => {
    // Pictures go through the native share sheet; a browser build offers the text result only.
    if (Platform.OS === 'web') return;
    let live = true;
    void imageSharer.supported().then((ok) => {
      if (live) setCanShareImage(ok);
    });
    return () => {
      live = false;
    };
  }, []);
  // The lesson stays up for this visit (even through the win) until the player dismisses it.
  const [lesson, setLesson] = useState(() =>
    level.lesson && !settings.lessonsSeen.includes(level.lesson) ? level.lesson : null,
  );

  useEffect(() => {
    if (!daily) rec.setLast(number);
    // Only on opening the level.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A quiet clock, shown only when the player asked for a timer.
  useEffect(() => {
    if (won) return;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [won, started]);

  // Notes fade on their own.
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(timer);
  }, [note]);

  // The beams' soft hum, a little fuller as more lamps light.
  useEffect(() => {
    const fraction = evaluation.total ? evaluation.lit / evaluation.total : 0;
    sounds.loop(won ? 0 : 0.18 + 0.22 * fraction);
  }, [evaluation.lit, evaluation.total, won, sounds]);
  useEffect(() => () => sounds.loop(0), [sounds]);

  // Each lamp that catches light chimes, each a step higher than the last.
  const before = useRef(evaluation.lamps);
  useEffect(() => {
    const prev = before.current;
    before.current = evaluation.lamps;
    let lit = 0;
    let woke = false;
    for (const [at, s] of evaluation.lamps) {
      const was = prev.get(at);
      const tile = level.tiles[at];
      if (tile?.kind === 'diya' && s === 'lit' && was !== 'lit') lit++;
      if (tile?.kind === 'sleeper' && s === 'wrong' && was !== 'wrong') woke = true;
    }
    if (lit > 0 && !evaluation.solved) {
      sounds.play(LIGHT_CUES[Math.min(LIGHT_CUES.length - 1, evaluation.lit - 1)]!);
      haptics.tick();
    }
    if (woke) {
      sounds.play('nope');
      haptics.thump();
    }
  }, [evaluation, level, sounds, haptics]);

  // Every lamp lit: the finale, the record, then the card.
  useEffect(() => {
    if (!evaluation.solved) return;
    const final = Math.floor((Date.now() - started) / 1000);
    sounds.play('win');
    haptics.delight();
    if (daily)
      rec.solveDaily(number, {
        seconds: final,
        hints,
        moves: state.moves,
        lamps: evaluation.total,
      });
    else rec.solveLevel(number, starsFor(hints));
    if (level.lesson && !settings.lessonsSeen.includes(level.lesson)) {
      update({ lessonsSeen: [...settings.lessonsSeen, level.lesson] });
    }
    const timer = setTimeout(() => setPanel({ seconds: final }), calmMotion ? 500 : 2300);
    return () => clearTimeout(timer);
  }, [evaluation.solved]); // eslint-disable-line react-hooks/exhaustive-deps

  // After a genuinely good moment (a clean solve, well into the game), the store's review card, once.
  useEffect(() => {
    if (!panel || settings.reviewAsked || hints > 0 || daily || number < 12) return;
    update({ reviewAsked: true });
    const timer = setTimeout(() => void reviews.request(), 2500);
    return () => clearTimeout(timer);
  }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = useCallback(
    (next: PlayState | null, cue: 'place' | 'rotate' | 'lift') => {
      if (!next) return false;
      setHistory((h) => commit(h, next));
      sounds.play(cue);
      if (cue === 'rotate') haptics.tick();
      else haptics.tap();
      return true;
    },
    [sounds, haptics],
  );

  const onTapCell = (at: number) => {
    if (won) return;
    const tile = level.tiles[at];
    const placed = state.placed[at];
    if (selected && isFree(level, state, at)) {
      const ok = act(place(level, state, selected, at), 'place');
      if (ok && (left.get(selected) ?? 0) <= 1) setSelected(null);
      return;
    }
    if (placed) {
      if (placed.hinted) return refuse(t('game.hinted'));
      if (placed.piece.type === 'mirror') act(rotate(state, at), 'rotate');
      else setNote(t('game.moveHelp'));
      return;
    }
    if (tile?.kind === 'piece') {
      if (tile.lock === 'fixed') return refuse(t('game.fixed'));
      if (state.hintedPivots.includes(at)) return refuse(t('game.hinted'));
      act(rotate(state, at), 'rotate');
      return;
    }
    if (!tile && level.tray.length > 0 && !selected) setNote(t('game.trayHelp'));
  };
  const refuse = (text: string) => {
    sounds.play('nope');
    haptics.thump();
    setNote(text);
  };
  const onTapSlot = (kind: PieceKind) => {
    if (won) return;
    if ((left.get(kind) ?? 0) <= 0) return setNote(t('game.trayEmpty'));
    sounds.play('tap');
    haptics.tap();
    setSelected((s) => (s === kind ? null : kind));
  };
  const onDropNew = (kind: PieceKind, at: number) => {
    if (won) return;
    if (
      act(place(level, state, kind, at), 'place') &&
      selected === kind &&
      (left.get(kind) ?? 0) <= 1
    ) {
      setSelected(null);
    }
  };
  const onDropMove = (from: number, at: number) => {
    if (won) return;
    if (at === -1) act(lift(state, from), 'lift');
    else act(move(level, state, from, at), 'place');
  };

  const reset = () => {
    // Pieces set by hints stay: they were earned.
    const fresh = startState(level);
    const kept = Object.fromEntries(Object.entries(state.placed).filter(([, p]) => p.hinted));
    const pivots = { ...fresh.pivots };
    for (const at of state.hintedPivots) pivots[at] = state.pivots[at] ?? 0;
    setHistory((h) =>
      commit(h, { placed: kept, pivots, hintedPivots: state.hintedPivots, moves: state.moves + 1 }),
    );
    setSelected(null);
    sounds.play('lift');
    haptics.thump();
  };

  const takeHint = (): boolean => {
    const hint = findHint(level, state);
    if (!hint) {
      setNote(t('hints.nothing'));
      return false;
    }
    if (!ent.takeHint()) return false;
    const next = applyHint(level, state, hint);
    setHistory((h) => ({ past: [], present: next, future: [] }));
    setHints((k) => k + 1);
    sounds.play('hint');
    haptics.delight();
    setSelected(null);
    return true;
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!area || Math.abs(area.w - width) > 1 || Math.abs(area.h - height) > 1)
      setArea({ w: width, h: height });
  };
  const layout = useMemo(() => (area ? layoutBoard(level, area.w, area.h) : null), [area, level]);

  const cellLabel = (at: number): string => describeCell(level, state, evaluation, at, t);

  const title = daily ? t('game.daily', { n: number }) : t('game.level', { n: number });
  const subtitle = daily ? t('daily.title') : t(CHAPTER_KEYS[chapterOf(number)]!);
  const stars = starsFor(hints);

  const share = async () => {
    const lamps = evaluation.total;
    const text = shareText(
      number,
      lamps,
      settings.timer ? (panel?.seconds ?? seconds) : null,
      hints,
      {
        name: t('app.name'),
        noHints: t('win.noHints'),
        hints: (k) => t('win.hintCount', { count: k }),
      },
    );
    const result = await textSharer.shareText(text);
    if (result === 'copied') setNote(t('win.copied'));
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 6 }]}
    >
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          label={t('common.back')}
          glass={false}
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
        <View
          style={[
            styles.lampChip,
            { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
          ]}
          accessible
          accessibilityLabel={t('game.lampsA11y', { lit: evaluation.lit, total: evaluation.total })}
          accessibilityLiveRegion="polite"
        >
          <Ionicons
            name="flame"
            size={16}
            color={evaluation.solved ? theme.accent : theme.accentText}
          />
          <AppText variant="heading" style={styles.chipText}>
            {t('game.lamps', { lit: evaluation.lit, total: evaluation.total })}
          </AppText>
        </View>
      </View>

      {lesson ? (
        <Animated.View
          entering={calmMotion ? undefined : FadeInDown.springify().damping(18)}
          style={[
            styles.lesson,
            { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
          ]}
        >
          <View style={[styles.lessonBadge, { backgroundColor: theme.accent }]}>
            <Ionicons name="sparkles" size={14} color={theme.onAccent} />
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

      <View style={styles.play} onLayout={onLayout}>
        {layout && (
          <GameBoard
            ref={canvas}
            level={level}
            state={state}
            evaluation={evaluation}
            layout={layout}
            look={look}
            scheme={theme.scheme}
            colourAid={settings.colourAid}
            calm={calmMotion}
            selected={won ? null : selected}
            trayLeft={left}
            won={won}
            cellLabel={cellLabel}
            onTapCell={onTapCell}
            onTapSlot={onTapSlot}
            onDropNew={onDropNew}
            onDropMove={onDropMove}
          />
        )}
        {note && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(220)}
            style={[styles.note, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
            pointerEvents="none"
          >
            <AppText variant="caption" color={theme.text} center accessibilityLiveRegion="polite">
              {note}
            </AppText>
          </Animated.View>
        )}
      </View>

      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
        <IconButton
          icon="arrow-undo"
          label={t('game.undo')}
          glass={false}
          disabled={won || history.past.length === 0}
          onPress={() => setHistory(undo)}
        />
        <IconButton
          icon="arrow-redo"
          label={t('game.redo')}
          glass={false}
          disabled={won || history.future.length === 0}
          onPress={() => setHistory(redo)}
        />
        <View style={styles.counter}>
          <AppText variant="caption" center>
            {t('game.moves', { count: state.moves })}
          </AppText>
          {settings.timer && (
            <AppText variant="heading" center color={theme.accentText}>
              {clock(seconds)}
            </AppText>
          )}
        </View>
        <IconButton
          icon="refresh"
          label={t('game.reset')}
          glass={false}
          disabled={won || state.moves === 0}
          onPress={reset}
        />
        <View>
          <IconButton
            icon="bulb"
            label={t('game.hint')}
            glass={false}
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

      <HintSheet
        visible={hintOpen}
        onClose={() => setHintOpen(false)}
        onUse={() => {
          if (takeHint()) setHintOpen(false);
        }}
      />

      {panel && (
        <WinPanel
          title={daily ? t('win.dailyTitle', { n: number }) : t('win.title')}
          stars={stars}
          moves={state.moves}
          seconds={settings.timer || daily ? panel.seconds : null}
          hints={hints}
          streak={daily ? rec.streak : null}
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
          isToday={daily && number === todayNumber(new Date())}
        />
      )}
    </View>
  );
}

type T = ReturnType<typeof useTranslation>['t'];
const DIRS = ['up', 'right', 'down', 'left'] as const;

/** What a screen reader says for a cell. */
function describeCell(
  level: Level,
  state: PlayState,
  evaluation: ReturnType<typeof evaluate>,
  at: number,
  t: T,
): string {
  const tile = level.tiles[at];
  const placed = state.placed[at];
  const row = Math.floor(at / level.w) + 1;
  const col = (at % level.w) + 1;
  let what = t('game.cells.empty');
  const pieceText = (p: NonNullable<typeof placed>['piece'], kind: 'free' | 'fixed' | 'pivot') => {
    if (p.type === 'mirror') {
      const slant = t(`game.slants.s${p.slant}`);
      if (kind === 'pivot') return t('game.cells.mirrorPivot', { slant });
      if (kind === 'fixed') return t('game.cells.mirrorFixed', { slant });
      return t('game.cells.mirror', { slant });
    }
    if (p.type === 'prism') return t('game.cells.prism');
    return t('game.cells.glass', {
      colour: t(`game.colours.${kindOf(p) as 'red' | 'yellow' | 'blue'}`),
    });
  };
  if (placed) {
    what = pieceText(placed.piece, 'free');
    if (placed.hinted) what += `, ${t('game.cells.hinted')}`;
  } else if (tile) {
    switch (tile.kind) {
      case 'wall':
        what = t('game.cells.wall');
        break;
      case 'flame':
        what = t('game.cells.flame', { dir: t(`game.dirs.${DIRS[tile.dir]}`) });
        break;
      case 'diya': {
        const s = evaluation.lamps.get(at) ?? 'dark';
        what = t('game.cells.lamp', {
          colour: t(`game.colours.${colourOf(tile.need) ?? 'white'}`),
          state: t(`game.states.${s}`),
        });
        break;
      }
      case 'sleeper':
        what = t('game.cells.sleeper', {
          state: t(
            evaluation.lamps.get(at) === 'wrong' ? 'game.states.awake' : 'game.states.asleep',
          ),
        });
        break;
      case 'oneway':
        what = t('game.cells.oneway', { dir: t(`game.dirs.${DIRS[tile.dir]}`) });
        break;
      case 'piece':
        what =
          tile.lock === 'pivot'
            ? pieceText({ type: 'mirror', slant: state.pivots[at] ?? 0 }, 'pivot')
            : pieceText(tile.piece, 'fixed');
        break;
    }
  }
  return t('game.cell', { what, row, col });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  locked: { paddingHorizontal: 32 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  titles: { flex: 1 },
  lampChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 15 },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 612,
    alignSelf: 'center',
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
    top: 8,
    left: 24,
    right: 24,
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
    paddingHorizontal: 14,
    paddingTop: 6,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  counter: { flex: 1, alignItems: 'center' },
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
