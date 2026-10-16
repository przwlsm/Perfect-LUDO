import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { CanvasRef } from '@shopify/react-native-skia';
import {
  CROSS,
  LINE,
  NO_CLUE,
  sizeLabel,
  starsFor,
  UNKNOWN,
  type Level,
  type Mark,
} from '@/domain/entities/Board';
import { lookById } from '@/domain/entities/Look';
import { gridOf } from '@/application/engine/grid';
import { cellCount, isSolved, lineCount, type Marks } from '@/application/engine/rules';
import { solve } from '@/application/engine/solver';
import { findHint } from '@/application/game/hint';
import {
  apply,
  clock,
  decodeMarks,
  encodeMarks,
  nextMark,
  redo,
  reset,
  startHistory,
  undo,
  type Change,
  type History,
} from '@/application/game/play';
import { dailyLevel, shareText, todayNumber } from '@/application/levels/daily';
import { chapterOf, difficultyOf, LEVEL_COUNT, levelFor } from '@/application/levels/levels';
import { imageSharer, reviews, textSharer } from '@/config/container';
import { fitBoard, ZOOM_FROM } from '../board/geometry';
import { KolamBoard, type HintGlow } from '../board/KolamBoard';
import { useSharePicture } from '../board/useSharePicture';
import { CHAPTER_KEYS } from '../components/chapters';
import { HintSheet } from '../components/HintSheet';
import { AppText, Button, IconButton, Pressy } from '../components/Kit';
import { WinPanel } from '../components/WinPanel';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useRecord } from '../state/RecordProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** `/play/12` plays level 12; `/play/d15` plays daily kolam #15. */
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

type Banner = { kind: 'lesson' | 'tip'; key: string; text: string } | null;

function Game({ level, number, daily }: GameProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings, update, seeHint, haptics, sounds, calmMotion } = useSettings();
  const ent = useEntitlements();
  const rec = useRecord();
  const { puzzle } = level;
  const grid = gridOf(puzzle.rows, puzzle.cols);
  const chosen = lookById(settings.look);
  const look = ent.isLookOpen(chosen) ? chosen : lookById('classic');
  const ink = theme.scheme === 'dawn' ? look.dawn : look.courtyard;
  const saved = rec.record.saves[level.id];

  // History lives in a ref (the truth, read by gestures mid-stroke) mirrored into state.
  const [initial] = useState(() => startHistory(decodeMarks(saved?.marks, grid.edgeCount)));
  const historyRef = useRef<History>(initial);
  const [history, setHistoryState] = useState(initial);
  const commit = useCallback((next: History) => {
    if (next === historyRef.current) return false;
    historyRef.current = next;
    setHistoryState(next);
    return true;
  }, []);
  const marks = history.marks;
  const won = useMemo(() => isSolved(puzzle, marks), [puzzle, marks]);
  const [solution, setSolution] = useState<Marks | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSolution(solve(puzzle)), 30);
    return () => clearTimeout(timer);
  }, [puzzle]);

  const [hints, setHints] = useState(saved?.hints ?? 0);
  const [seconds, setSeconds] = useState(saved?.seconds ?? 0);
  const secondsRef = useRef(seconds);
  const [glow, setGlow] = useState<HintGlow | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [panel, setPanel] = useState<{ seconds: number } | null>(null);
  const [panelH, setPanelH] = useState(0);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [toolbarH, setToolbarH] = useState(0);
  const [zoom, setZoom] = useState({ n: 0, to: 1 });
  const [zoomed, setZoomed] = useState(false);
  const canvas = useRef<CanvasRef>(null);
  const sharePicture = useSharePicture(
    canvas,
    daily ? `daily-${number}` : `level-${number}`,
    theme.background,
    theme.scheme === 'dawn' ? '#f7f0e3' : '#7b2d1a',
  );
  const [canShareImage, setCanShareImage] = useState(false);
  useEffect(() => {
    // Pictures go through the native share sheet; a browser offers the text result only.
    if (Platform.OS === 'web') return;
    let live = true;
    void imageSharer.supported().then((ok) => {
      if (live) setCanShareImage(ok);
    });
    return () => {
      live = false;
    };
  }, []);

  const zoomable = Math.max(puzzle.rows, puzzle.cols) > ZOOM_FROM;
  // One gentle line at a time: the level's lesson, else a first-time tip.
  const [banner, setBanner] = useState<Banner>(() => {
    const seen = settings.hintsSeen;
    // The first lesson already says how to draw; after it, the drawing tip comes first.
    if (level.lesson !== 'loop' && !seen.includes('tip:draw')) {
      return { kind: 'tip', key: 'tip:draw', text: t('game.firstTip') };
    }
    if (level.lesson && !seen.includes(`lesson:${level.lesson}`)) {
      return { kind: 'lesson', key: `lesson:${level.lesson}`, text: t(`lessons.${level.lesson}`) };
    }
    if (zoomable && !seen.includes('tip:zoom')) {
      return { kind: 'tip', key: 'tip:zoom', text: t('game.zoomTip') };
    }
    return null;
  });
  const dismissBanner = () => {
    if (banner) seeHint(banner.key);
    setBanner(null);
  };

  useEffect(() => {
    if (!daily) rec.setLast(number);
    // Only on opening the level.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A quiet clock (shown only when the player asked for a timer).
  const showClock = settings.timer;
  useEffect(() => {
    if (won) return;
    const timer = setInterval(() => {
      secondsRef.current += 1;
      // Only a visible clock needs the screen to redraw each second.
      if (showClock) setSeconds(secondsRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [won, showClock]);

  // Notes fade on their own; a hint's reason stays a little longer.
  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), glow ? 5200 : 2800);
    return () => clearTimeout(timer);
  }, [note, glow]);

  // Boards in progress are kept, so a player can leave and come back.
  useEffect(() => {
    if (won) return;
    const timer = setTimeout(() => {
      const empty = lineCount(marks) === 0 && !marks.includes(CROSS);
      rec.keep(
        level.id,
        empty && hints === 0
          ? null
          : { marks: encodeMarks(marks), seconds: secondsRef.current, hints },
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [marks, hints]); // eslint-disable-line react-hooks/exhaustive-deps

  // Solved: the chime, the record, the bloom, then the card.
  useEffect(() => {
    if (!won) return;
    const final = secondsRef.current;
    sounds.play('solve');
    haptics.delight();
    AccessibilityInfo.announceForAccessibility(t('win.revealA11y'));
    if (daily) rec.solveDaily(number, { seconds: final, hints });
    else rec.solveLevel(number, starsFor(hints));
    if (level.lesson) seeHint(`lesson:${level.lesson}`);
    const timer = setTimeout(() => setPanel({ seconds: final }), calmMotion ? 1300 : 3300);
    return () => clearTimeout(timer);
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  // After a genuinely good moment (a clean solve, well into the game), the store's review card, once.
  useEffect(() => {
    if (!panel || settings.reviewAsked || hints > 0 || daily || number < 12) return;
    update({ reviewAsked: true });
    const timer = setTimeout(() => void reviews.request(), 2500);
    return () => clearTimeout(timer);
  }, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

  const cue = (mark: Mark) => {
    if (mark === LINE) {
      sounds.play('segment');
      haptics.tick();
    } else if (mark === CROSS) {
      sounds.play('cross');
      haptics.tick();
    } else {
      sounds.play('erase');
    }
  };
  const afterMove = () => {
    if (glow) setGlow(null);
    if (banner?.kind === 'tip' && banner.key === 'tip:draw') dismissBanner();
  };

  const onTapEdge = (edge: number) => {
    const h = historyRef.current;
    const mark = nextMark(h.marks[edge]!);
    if (commit(apply(h, [{ edge, mark }]))) {
      cue(mark);
      afterMove();
    }
  };
  // A drag draws lines; a drag that starts on a line erases instead.
  const strokeRef = useRef<{ mark: Mark; stepped: boolean } | null>(null);
  const onStroke = (edge: number, first: boolean) => {
    const h = historyRef.current;
    if (first || !strokeRef.current) {
      strokeRef.current = { mark: h.marks[edge] === LINE ? UNKNOWN : LINE, stepped: false };
    }
    const s = strokeRef.current;
    if (commit(apply(h, [{ edge, mark: s.mark }], s.stepped))) {
      s.stepped = true;
      cue(s.mark);
    }
  };
  const onStrokeEnd = () => {
    strokeRef.current = null;
    afterMove();
  };

  const clearBoard = () => {
    if (commit(reset(historyRef.current))) {
      sounds.play('erase');
      haptics.thump();
      setGlow(null);
      setZoom((z) => ({ n: z.n + 1, to: 1 }));
      setNote(t('game.resetDone'));
    }
  };

  const takeHint = (): boolean => {
    if (!solution) return false;
    const h = historyRef.current;
    const hint = findHint(puzzle, h.marks, solution);
    if (hint.changes.length === 0) return false;
    if (!ent.takeHint()) return false;
    const reason =
      hint.kind === 'mistake'
        ? h.marks[hint.changes[0]!.edge] === LINE
          ? t('hints.reasons.mistakeLine')
          : t('hints.reasons.mistakeCross')
        : t(`hints.reasons.${hint.kind}`, { n: hint.n ?? 0 });
    const changes: Change[] = hint.changes.map((c) => ({ edge: c.edge, mark: c.mark }));
    commit(apply(h, changes));
    setHints((k) => k + 1);
    setGlow({
      key: Date.now(),
      edges: hint.changes.map((c) => c.edge),
      cells: hint.cells,
      dots: hint.dots,
    });
    setNote(reason);
    sounds.play('hint');
    haptics.pop();
    return true;
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!area || Math.abs(area.w - width) > 1 || Math.abs(area.h - height) > 1) {
      setArea({ w: width, h: height });
    }
  };
  const geom = useMemo(
    () => (area ? fitBoard(puzzle.rows, puzzle.cols, area.w, area.h) : null),
    [area, puzzle],
  );

  // When the card rises, the kolam rises and shrinks to stay in full view above it.
  const lift = useSharedValue(0);
  const target = useMemo(() => {
    if (!geom || !panelH) return { k: 1, y: 0 };
    const free = geom.height + toolbarH - panelH - 8;
    const k = Math.min(1, (free - 8) / (geom.floor.h + 4));
    const fc = geom.floor.y + geom.floor.h / 2;
    const y = free / 2 - geom.height / 2 - (fc - geom.height / 2) * k;
    return { k, y };
  }, [geom, panelH, toolbarH]);
  useEffect(() => {
    lift.set(
      panel && panelH
        ? calmMotion
          ? withTiming(1, { duration: 250 })
          : withSpring(1, { damping: 20, stiffness: 140 })
        : withTiming(0, { duration: 200 }),
    );
  }, [panel, panelH, calmMotion, lift]);
  const liftStyle = useAnimatedStyle(() => {
    const v = lift.get();
    return {
      transform: [{ translateY: target.y * v }, { scale: 1 + (target.k - 1) * v }],
    };
  });

  const title = daily ? t('game.daily', { n: number }) : t('game.level', { n: number });
  const subtitle = daily
    ? `${t('daily.title')} · ${sizeLabel(puzzle)}`
    : `${t(CHAPTER_KEYS[chapterOf(number)]!)} · ${sizeLabel(puzzle)}`;

  const share = async () => {
    const text = shareText(
      number,
      sizeLabel(puzzle),
      settings.timer || daily ? (panel?.seconds ?? secondsRef.current) : null,
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

  const edgeLabel = (e: number) => {
    const a = grid.edgeDots[e * 2]!;
    const b = grid.edgeDots[e * 2 + 1]!;
    const w = puzzle.cols + 1;
    const m = marks[e];
    return t('game.edge', {
      r1: Math.floor(a / w) + 1,
      c1: (a % w) + 1,
      r2: Math.floor(b / w) + 1,
      c2: (b % w) + 1,
      state: t(`game.edgeStates.${m === LINE ? 'line' : m === CROSS ? 'cross' : 'open'}`),
    });
  };
  const cellLabel = (cell: number) => {
    const clue = puzzle.clues[cell]!;
    const what =
      clue === NO_CLUE
        ? t('game.cellEmpty')
        : t('game.cellClue', { n: clue, lines: cellCount(grid, marks, cell, LINE) });
    return t('game.cell', {
      row: Math.floor(cell / puzzle.cols) + 1,
      col: (cell % puzzle.cols) + 1,
      what,
    });
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
          style={[styles.chip, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}
          accessible
          accessibilityLabel={
            settings.timer ? clock(seconds) : t(`difficulty.${difficultyOf(level)}`)
          }
        >
          {settings.timer ? (
            <>
              <Ionicons name="time-outline" size={15} color={theme.accentText} />
              <AppText variant="heading" style={styles.chipText}>
                {clock(panel?.seconds ?? seconds)}
              </AppText>
            </>
          ) : (
            <AppText variant="label" color={theme.accentText}>
              {t(`difficulty.${difficultyOf(level)}`)}
            </AppText>
          )}
        </View>
      </View>

      {banner && !won ? (
        <Animated.View
          entering={calmMotion ? undefined : FadeInDown.springify().damping(18)}
          exiting={FadeOut.duration(180)}
          style={[
            styles.banner,
            { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
          ]}
        >
          <View style={[styles.bannerBadge, { backgroundColor: theme.accent }]}>
            <Ionicons
              name={banner.kind === 'lesson' ? 'flower' : 'hand-left'}
              size={14}
              color={theme.onAccent}
            />
          </View>
          <AppText variant="body" style={styles.flex}>
            {banner.text}
          </AppText>
          <Pressy
            onPress={dismissBanner}
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
        {geom && (
          <Animated.View style={[styles.boardWrap, liftStyle]}>
            <KolamBoard
              ref={canvas}
              puzzle={puzzle}
              marks={marks}
              geom={geom}
              ink={ink}
              palette={theme}
              showErrors={settings.showErrors}
              autoCross={settings.autoCross}
              calm={calmMotion}
              won={won}
              zoomable={zoomable}
              glow={won ? null : glow}
              onTapEdge={onTapEdge}
              onStroke={onStroke}
              onStrokeEnd={onStrokeEnd}
              edgeLabel={edgeLabel}
              cellLabel={cellLabel}
              zoom={zoom}
              onZoomed={setZoomed}
            />
          </Animated.View>
        )}
        {note && !won && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(220)}
            style={[styles.note, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
            pointerEvents="none"
          >
            {glow && <Ionicons name="bulb" size={16} color={theme.accentText} />}
            <AppText
              variant="body"
              color={theme.text}
              style={styles.flexShrink}
              accessibilityLiveRegion="polite"
            >
              {note}
            </AppText>
          </Animated.View>
        )}
      </View>

      <View
        onLayout={(e) => setToolbarH(e.nativeEvent.layout.height)}
        style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}
      >
        <IconButton
          icon="arrow-undo"
          label={t('game.undo')}
          glass={false}
          disabled={won || history.past.length === 0}
          onPress={() => {
            if (commit(undo(historyRef.current))) sounds.play('erase');
          }}
        />
        <IconButton
          icon="arrow-redo"
          label={t('game.redo')}
          glass={false}
          disabled={won || history.future.length === 0}
          onPress={() => {
            if (commit(redo(historyRef.current))) sounds.play('segment');
          }}
        />
        <View style={styles.flex} />
        {zoomable && (
          <IconButton
            icon={zoomed ? 'contract-outline' : 'expand-outline'}
            label={zoomed ? t('game.fit') : t('game.zoomIn')}
            glass={false}
            disabled={won}
            active={zoomed}
            onPress={() => setZoom((z) => ({ n: z.n + 1, to: zoomed ? 1 : 2.2 }))}
          />
        )}
        <IconButton
          icon="refresh"
          label={t('game.reset')}
          glass={false}
          disabled={won || (lineCount(marks) === 0 && !marks.includes(CROSS))}
          onPress={clearBoard}
        />
        <View>
          <IconButton
            icon="bulb"
            label={t('game.hint')}
            glass={false}
            disabled={won || !solution}
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
          stars={starsFor(hints)}
          size={sizeLabel(puzzle)}
          seconds={settings.timer || daily ? panel.seconds : null}
          hints={hints}
          streak={daily && number === todayNumber(new Date()) ? rec.streak : null}
          last={!daily && number === LEVEL_COUNT}
          onHeight={setPanelH}
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
          onReplay={() => {
            rec.keep(level.id, null);
            router.replace({
              pathname: '/play/[id]',
              params: { id: daily ? `d${number}` : String(number) },
            });
          }}
          levelsLabel={daily ? t('win.archive') : t('win.levels')}
          onLevels={() => router.replace(daily ? '/daily' : '/levels')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centre: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  locked: { paddingHorizontal: 32 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    minWidth: 48,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 15 },
  banner: {
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
  bannerBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotIt: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  play: { flex: 1, overflow: 'hidden' },
  boardWrap: { flex: 1 },
  note: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    maxWidth: 560,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
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
