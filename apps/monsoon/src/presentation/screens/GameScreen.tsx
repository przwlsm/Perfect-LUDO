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
import { bitCount, openings, type Level } from '@/domain/entities/Board';
import { themeById } from '@/domain/entities/Theme';
import { CHIME_CUES } from '@/domain/ports/Sounds';
import type { Flow } from '@/application/engine/flow';
import { damOutlet } from '@/application/engine/flow';
import { applyHint, findHint } from '@/application/game/hint';
import {
  cloudsLeft,
  commit,
  evaluate,
  historyOf,
  redo,
  refusal,
  restart,
  startState,
  starsFor,
  turn,
  undo,
  type History,
  type PlayState,
} from '@/application/game/play';
import { dailyLevel, shareText, todayNumber } from '@/application/levels/daily';
import { chapterOf, LEVEL_COUNT, levelFor } from '@/application/levels/levels';
import { imageSharer, reviews, textSharer } from '@/config/container';
import type { Timeline } from '../board/BoardView';
import { GameBoard } from '../board/GameBoard';
import { layoutBoard } from '../board/layout';
import { useSharePicture } from '../board/useSharePicture';
import { CHAPTER_KEYS } from '../components/chapters';
import { HintSheet } from '../components/HintSheet';
import { MonsoonSky } from '../components/MonsoonSky';
import { AppText, Button, IconButton, Pressy } from '../components/Kit';
import { WinPanel } from '../components/WinPanel';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useRecord } from '../state/RecordProvider';
import { useSettings } from '../state/SettingsProvider';
import { LOOKS } from '../theme/looks';
import { useTheme } from '../theme/ThemeProvider';

/** `/play/12` plays level 12; `/play/d15` plays daily field #15. */
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
  const chosen = themeById(settings.theme);
  const look = LOOKS[ent.isThemeOpen(chosen) ? chosen.id : 'terraces'];

  const [history, setHistory] = useState<History>(() => historyOf(startState(level)));
  const state = history.present;
  const evaluation = useMemo(() => evaluate(level, state), [level, state]);
  const won = evaluation.solved;
  const [hints, setHints] = useState(0);
  const [panel, setPanel] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [started] = useState(() => Date.now());
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

  // Notes fade on their own.
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(timer);
  }, [note]);

  // The rain bed with its trickle, fuller as more channels carry water. It stops when the clouds part.
  const network = useMemo(() => {
    let wet = 0;
    let all = 0;
    level.tiles.forEach((tile, a) => {
      if (tile.kind === 'rock') return;
      all++;
      if (evaluation.wet[a * 2]) wet++;
    });
    return all ? wet / all : 0;
  }, [level, evaluation]);
  useEffect(() => {
    sounds.loop(won ? 0 : 0.14 + 0.36 * network);
  }, [network, won, sounds]);
  useEffect(() => () => sounds.loop(0), [sounds]);

  // Sounds that land when the water does: a chime per field, a pop as the rice comes up.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const greened = useRef(0);
  const onTimeline = useCallback(
    (tl: Timeline) => {
      for (const f of tl.fields) {
        const step = greened.current++;
        const tile = level.tiles[f.at];
        const pond = tile?.kind === 'field' && tile.water === 1;
        timers.current.push(
          setTimeout(() => {
            sounds.play(CHIME_CUES[Math.min(CHIME_CUES.length - 1, step % CHIME_CUES.length)]!);
            haptics.tick();
          }, f.delay),
          setTimeout(() => sounds.play('sprout'), f.delay + 260),
        );
        if (settings.frogs && (pond || step % 3 === 2)) {
          timers.current.push(setTimeout(() => sounds.play('frog'), f.delay + 900));
        }
      }
      if (tl.newLeaks > 0) {
        timers.current.push(setTimeout(() => sounds.play('splash'), Math.min(400, tl.settle)));
      }
    },
    [level, sounds, haptics, settings.frogs],
  );

  // Every field green: the finale, the record, then the card.
  useEffect(() => {
    if (!won) return;
    const stars = starsFor(hints, state.turns, level.budget);
    timers.current.push(
      setTimeout(() => {
        sounds.play('win');
        haptics.delight();
      }, 450),
    );
    if (daily) {
      let paddies = 0;
      let ponds = 0;
      for (const tile of level.tiles) {
        if (tile.kind === 'field') {
          if (tile.water === 1) ponds++;
          else paddies++;
        }
      }
      rec.solveDaily(number, {
        turns: state.turns,
        hints,
        seconds: Math.floor((Date.now() - started) / 1000),
        paddies,
        ponds,
      });
    } else rec.solveLevel(number, stars);
    if (level.lesson && !settings.lessonsSeen.includes(level.lesson)) {
      update({ lessonsSeen: [...settings.lessonsSeen, level.lesson] });
    }
    const timer = setTimeout(() => setPanel(true), calmMotion ? 900 : 2600);
    return () => clearTimeout(timer);
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  // After a genuinely good moment (a clean solve, well into the game), the store's review card, once.
  useEffect(() => {
    if (!panel || settings.reviewAsked || hints > 0 || daily || number < 12) return;
    update({ reviewAsked: true });
    const timer = setTimeout(() => void reviews.request(), 2500);
    return () => clearTimeout(timer);
  }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

  const refuse = (text: string) => {
    sounds.play('nope');
    haptics.thump();
    setNote(text);
  };

  const onTapCell = (at: number) => {
    if (won) return;
    const why = refusal(level, state, at);
    if (why) {
      if (level.tiles[at]?.kind !== 'rock') refuse(t(`game.${why}`));
      return;
    }
    const next = turn(level, state, at);
    if (!next) return;
    setHistory((h) => commit(h, next));
    sounds.play('clack');
    haptics.tap();
  };

  const reset = () => {
    setHistory((h) => commit(h, restart(level, h.present)));
    sounds.play('clack');
    haptics.thump();
  };

  const takeHint = (): boolean => {
    const hint = findHint(level, state);
    if (!hint) {
      setNote(t('hints.nothing'));
      return false;
    }
    if (!ent.takeHint()) return false;
    setHistory((h) => ({ past: [], present: applyHint(h.present, hint), future: [] }));
    setHints((k) => k + 1);
    sounds.play('hint');
    haptics.delight();
    return true;
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!area || Math.abs(area.w - width) > 1 || Math.abs(area.h - height) > 1)
      setArea({ w: width, h: height });
  };
  const layout = useMemo(
    () => (area ? layoutBoard(level, area.w, area.h, 88) : null),
    [area, level],
  );

  const title = daily ? t('game.daily', { n: number }) : t('game.level', { n: number });
  const subtitle = daily ? t('daily.title') : t(CHAPTER_KEYS[chapterOf(number)]!);
  const stars = starsFor(hints, state.turns, level.budget);
  const clouds = cloudsLeft(level, state);

  const share = async () => {
    let paddies = 0;
    let ponds = 0;
    for (const tile of level.tiles) {
      if (tile.kind === 'field') {
        if (tile.water === 1) ponds++;
        else paddies++;
      }
    }
    const text = shareText(number, { paddies, ponds }, state.turns, hints, {
      name: t('app.name'),
      turns: (k) => t('win.turnCount', { count: k }),
      noHints: t('win.noHints'),
      hints: (k) => t('win.hintCount', { count: k }),
    });
    const result = await textSharer.shareText(text);
    if (result === 'copied') setNote(t('win.copied'));
  };

  const status = statusLine(evaluation, t);

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 6 }]}
    >
      <MonsoonSky clear={won} />
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          label={t('common.back')}
          glass={false}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <View style={styles.titles}>
          <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        {clouds !== null && (
          <View
            style={[
              styles.chip,
              { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
            ]}
            accessible
            accessibilityLabel={
              clouds > 0 ? t('game.cloudsA11y', { count: clouds }) : t('game.cloudsGoneA11y')
            }
          >
            <Ionicons name={clouds > 0 ? 'cloud' : 'partly-sunny'} size={16} color={theme.cloud} />
            <AppText variant="heading" style={styles.chipText}>
              {clouds > 0 ? t('game.clouds', { count: clouds }) : '0'}
            </AppText>
          </View>
        )}
        <View
          style={[styles.chip, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
          accessible
          accessibilityLabel={t('game.fieldsA11y', {
            wet: evaluation.fieldsWet,
            total: evaluation.fieldsTotal,
          })}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="leaf" size={16} color={theme.accentText} />
          <AppText variant="heading" style={styles.chipText}>
            {t('game.fields', { wet: evaluation.fieldsWet, total: evaluation.fieldsTotal })}
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
            <Ionicons name="water" size={14} color={theme.onAccent} />
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
            rot={state.rot}
            hinted={state.hinted}
            flow={evaluation}
            layout={layout}
            look={look}
            scheme={theme.scheme}
            calm={calmMotion}
            colourAid={settings.colourAid}
            celebrate
            disabled={won}
            onTimeline={onTimeline}
            onTapCell={onTapCell}
            cellLabel={(at) => describeCell(level, state, evaluation, at, t)}
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

      <AppText
        variant="caption"
        center
        style={styles.status}
        color={won ? theme.accentText : theme.muted}
        accessibilityLiveRegion="polite"
        numberOfLines={1}
      >
        {status}
      </AppText>

      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
        <IconButton
          icon="arrow-undo"
          label={t('game.undo')}
          glass={false}
          disabled={won || history.past.length === 0}
          onPress={() => {
            setHistory(undo);
            sounds.play('clack');
          }}
        />
        <IconButton
          icon="arrow-redo"
          label={t('game.redo')}
          glass={false}
          disabled={won || history.future.length === 0}
          onPress={() => {
            setHistory(redo);
            sounds.play('clack');
          }}
        />
        <View style={styles.counter}>
          <AppText variant="heading" center>
            {t('game.turns', { count: state.turns })}
          </AppText>
        </View>
        <IconButton
          icon="refresh"
          label={t('game.reset')}
          glass={false}
          disabled={won || state.turns === 0}
          onPress={reset}
        />
        <View>
          <IconButton
            icon="bulb"
            label={t('game.hint')}
            glass={false}
            disabled={won}
            tint={theme.gold}
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
          turns={state.turns}
          budget={level.budget}
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
          levelsLabel={daily ? t('daily.archive') : t('win.levels')}
          isToday={daily && number === todayNumber(new Date())}
        />
      )}
    </View>
  );
}

type T = ReturnType<typeof useTranslation>['t'];

/** One plain line about what the water is doing. */
function statusLine(f: Flow, t: T): string {
  if (f.solved) return t('game.status.done');
  if (f.leaks.length) return t('game.status.spilling', { count: f.leaks.length });
  if (f.mixed) return t('game.status.mixing');
  if (f.blocked.length) return t('game.status.blocked');
  if (f.dry) return t('game.status.dry', { count: f.dry });
  return t('game.status.flowing');
}

const DIR_KEYS = ['north', 'east', 'south', 'west'] as const;

function sidesText(mask: number, t: T): string {
  const names = DIR_KEYS.filter((_, d) => mask & (1 << d)).map((k) => t(`game.dirs.${k}`));
  if (names.length <= 1) return names[0] ?? '';
  return t('game.and', { a: names.slice(0, -1).join(', '), b: names.at(-1)! });
}

/** What a screen reader says for a cell. */
function describeCell(level: Level, state: PlayState, f: Flow, at: number, t: T): string {
  const tile = level.tiles[at]!;
  const row = Math.floor(at / level.w) + 1;
  const col = (at % level.w) + 1;
  const r = state.rot[at] ?? 0;
  const mask = openings(tile, r);
  const wet = f.wet[at * 2]!;
  const wetState =
    wet === 3 ? t('game.states.mixed') : wet ? t('game.states.wet') : t('game.states.dry');
  let what: string;
  switch (tile.kind) {
    case 'rock':
      what = t('game.cells.rock');
      break;
    case 'bridge':
      what = t('game.cells.bridge');
      break;
    case 'source':
      what = t(tile.water === 0 ? 'game.cells.spring' : 'game.cells.tank', {
        open: sidesText(mask, t),
      });
      break;
    case 'field': {
      const s = f.fields.get(at) ?? 'dry';
      what = t(tile.water === 0 ? 'game.cells.paddy' : 'game.cells.pond', {
        open: sidesText(mask, t),
        state:
          s === 'wet'
            ? t('game.states.green')
            : s === 'wrong'
              ? t('game.states.wrong')
              : t('game.states.dry'),
      });
      break;
    }
    case 'dam':
      what = t('game.cells.dam', {
        dir: t(`game.dirs.${DIR_KEYS[damOutlet(tile, r)]}`),
        state: wetState,
      });
      break;
    default: {
      const k = bitCount(mask);
      const shape =
        k === 1
          ? 'deadEnd'
          : k === 3
            ? 'tee'
            : k === 4
              ? 'cross'
              : mask === 5 || mask === 10
                ? 'straight'
                : 'bend';
      what = t('game.cells.channel', {
        shape: t(`game.shapes.${shape}`),
        open: sidesText(mask, t),
        state: wetState,
      });
    }
  }
  const extras: string[] = [];
  if (tile.kind !== 'rock' && tile.kind !== 'bridge' && tile.fixed)
    extras.push(t('game.cells.pinned'));
  if (state.hinted.includes(at)) extras.push(t('game.cells.hinted'));
  if (f.leaks.some((l) => l.at === at)) extras.push(t('game.cells.spilling'));
  return t('game.cell', { what: [what, ...extras].join(', '), row, col });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  locked: { paddingHorizontal: 32 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  titles: { flex: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
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
  status: { paddingHorizontal: 20, marginTop: 2 },
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
