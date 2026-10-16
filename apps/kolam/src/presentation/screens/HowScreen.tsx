import { useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CROSS, LINE, UNKNOWN, type Mark } from '@/domain/entities/Board';
import { lookById } from '@/domain/entities/Look';
import { gridOf } from '@/application/engine/grid';
import { isSolved } from '@/application/engine/rules';
import { apply, nextMark, reset, startHistory, type History } from '@/application/game/play';
import { TUTORIAL } from '@/application/levels/tutorial';
import { fitBoard } from '../board/geometry';
import { KolamBoard } from '../board/KolamBoard';
import { AppText, Button, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const RULES = [
  { key: 'loop', icon: 'infinite-outline' },
  { key: 'numbers', icon: 'grid-outline' },
  { key: 'cross', icon: 'close-outline' },
  { key: 'drag', icon: 'hand-left-outline' },
] as const;
const TIPS = ['zero', 'corner', 'dot'] as const;

/** The rules in a few lines, and a tiny board to try them on straight away. */
export function HowScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { settings, haptics, sounds, calmMotion } = useSettings();
  const ent = useEntitlements();
  const chosen = lookById(settings.look);
  const look = ent.isLookOpen(chosen) ? chosen : lookById('classic');
  const ink = theme.scheme === 'dawn' ? look.dawn : look.courtyard;
  const grid = gridOf(TUTORIAL.puzzle.rows, TUTORIAL.puzzle.cols);
  const [history, setHistory] = useState<History>(() =>
    startHistory(new Uint8Array(grid.edgeCount)),
  );
  const ref = useRef(history);
  const [touching, setTouching] = useState(false);
  const stroke = useRef<{ mark: Mark; stepped: boolean } | null>(null);
  const won = isSolved(TUTORIAL.puzzle, history.marks);
  const side = Math.min(Math.min(width, 640) - 32 - 36, 300);
  const geom = useMemo(() => fitBoard(3, 3, side, side, 90), [side]);

  const commit = (next: History) => {
    if (next === ref.current) return false;
    ref.current = next;
    setHistory(next);
    if (isSolved(TUTORIAL.puzzle, next.marks)) {
      sounds.play('solve');
      haptics.delight();
    }
    return true;
  };
  const cue = (mark: Mark) => {
    sounds.play(mark === LINE ? 'segment' : mark === CROSS ? 'cross' : 'erase');
    if (mark !== UNKNOWN) haptics.tick();
  };

  return (
    <Page title={t('how.title')} scrollEnabled={!touching}>
      <AppText variant="body" color={theme.muted}>
        {t('how.lead')}
      </AppText>
      <Card style={styles.try}>
        <AppText variant="label" color={theme.accentText}>
          {t('how.tryIt')}
        </AppText>
        <AppText variant="body" accessibilityLiveRegion="polite">
          {won ? t('how.tryDone') : t('how.tryLead')}
        </AppText>
        <View style={styles.board}>
          <KolamBoard
            puzzle={TUTORIAL.puzzle}
            marks={history.marks}
            geom={geom}
            ink={ink}
            palette={theme}
            showErrors
            autoCross
            calm={calmMotion}
            won={won}
            zoomable={false}
            onTouch={setTouching}
            onTapEdge={(edge) => {
              const mark = nextMark(ref.current.marks[edge]!);
              if (commit(apply(ref.current, [{ edge, mark }]))) cue(mark);
            }}
            onStroke={(edge, first) => {
              if (first || !stroke.current) {
                stroke.current = {
                  mark: ref.current.marks[edge] === LINE ? UNKNOWN : LINE,
                  stepped: false,
                };
              }
              const s = stroke.current;
              if (commit(apply(ref.current, [{ edge, mark: s.mark }], s.stepped))) {
                s.stepped = true;
                cue(s.mark);
              }
            }}
            onStrokeEnd={() => {
              stroke.current = null;
            }}
            edgeLabel={(e) => {
              const a = grid.edgeDots[e * 2]!;
              const b = grid.edgeDots[e * 2 + 1]!;
              const m = history.marks[e];
              return t('game.edge', {
                r1: Math.floor(a / 4) + 1,
                c1: (a % 4) + 1,
                r2: Math.floor(b / 4) + 1,
                c2: (b % 4) + 1,
                state: t(`game.edgeStates.${m === LINE ? 'line' : m === CROSS ? 'cross' : 'open'}`),
              });
            }}
          />
        </View>
        {(won || history.past.length > 0) && (
          <Button
            kind="secondary"
            compact
            icon="refresh"
            label={t('how.tryAgain')}
            onPress={() => {
              const cleared = reset(ref.current);
              ref.current = startHistory(cleared.marks);
              setHistory(ref.current);
              sounds.play('erase');
            }}
          />
        )}
      </Card>

      <Card style={styles.list}>
        {RULES.map((r) => (
          <View key={r.key} style={styles.point}>
            <View style={[styles.icon, { backgroundColor: theme.surfaceRaised }]}>
              <Ionicons name={r.icon} size={20} color={theme.accentText} />
            </View>
            <AppText variant="body" style={styles.flex}>
              {t(`how.rules.${r.key}`)}
            </AppText>
          </View>
        ))}
      </Card>

      <Card style={styles.list}>
        <AppText variant="heading">{t('how.tips')}</AppText>
        {TIPS.map((k) => (
          <View key={k} style={styles.point}>
            <AppText variant="heading" color={theme.accentText}>
              ✿
            </AppText>
            <AppText variant="body" style={styles.flex}>
              {t(`how.tipList.${k}`)}
            </AppText>
          </View>
        ))}
      </Card>

      <AppText variant="body" color={theme.muted}>
        {t('how.stars')}
      </AppText>
      <AppText variant="body" color={theme.muted}>
        {t('how.daily')}
      </AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  try: { gap: 12 },
  board: { alignItems: 'center' },
  list: { gap: 14 },
  point: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
