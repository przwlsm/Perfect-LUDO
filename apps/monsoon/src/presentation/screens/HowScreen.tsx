import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Level } from '@/domain/entities/Board';
import { flow } from '@/application/engine/flow';
import { refusal } from '@/application/game/play';
import { HOW_BOARDS } from '@/application/levels/handmade';
import { GameBoard } from '../board/GameBoard';
import { layoutBoard } from '../board/layout';
import { AppText, Button, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useSettings } from '../state/SettingsProvider';
import { LOOKS } from '../theme/looks';
import { useTheme } from '../theme/ThemeProvider';

const STEPS = ['turn', 'spill', 'bridge', 'dam', 'two'] as const;

const RULES: readonly {
  key: 'fixed' | 'clouds' | 'stars' | 'daily' | 'colours';
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'fixed', icon: 'lock-closed-outline' },
  { key: 'clouds', icon: 'cloud-outline' },
  { key: 'stars', icon: 'star-outline' },
  { key: 'daily', icon: 'calendar-outline' },
  { key: 'colours', icon: 'color-filter-outline' },
];

/** The whole game in five small boards the player can turn and solve. */
export function HowScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 640) - 32 - 36;
  return (
    <Page title={t('how.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('how.lead')}
      </AppText>
      {STEPS.map((step) => (
        <Card key={step} style={styles.card}>
          <MiniPuzzle level={HOW_BOARDS[step]} width={w} />
          <AppText variant="body">{t(`how.boards.${step}`)}</AppText>
        </Card>
      ))}
      <Card style={styles.card}>
        {RULES.map((r) => (
          <View key={r.key} style={styles.rule}>
            <Ionicons name={r.icon} size={20} color={theme.accentText} />
            <AppText variant="body" style={styles.flex}>
              {t(`how.rules.${r.key}`)}
            </AppText>
          </View>
        ))}
      </Card>
    </Page>
  );
}

function MiniPuzzle({ level, width }: { level: Level; width: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { calmMotion, settings, sounds, haptics } = useSettings();
  const [rot, setRot] = useState<readonly number[]>(level.start);
  const evaluation = useMemo(() => flow(level, rot), [level, rot]);
  const height = Math.min(Math.round(width * 0.62), Math.round((width / level.w) * level.h) + 24);
  const layout = useMemo(() => layoutBoard(level, width, height, 72), [level, width, height]);
  const hinted = useMemo(() => [] as number[], []);
  const solved = evaluation.solved;
  const state = { rot, hinted, turns: 0 };
  return (
    <View style={styles.mini}>
      <GameBoard
        level={level}
        rot={rot}
        hinted={hinted}
        flow={evaluation}
        layout={layout}
        look={LOOKS.terraces}
        scheme={theme.scheme}
        calm={calmMotion}
        colourAid={settings.colourAid}
        rain={false}
        disabled={solved}
        onTimeline={(tl) => {
          if (tl.fields.length) setTimeout(() => sounds.play('chime3'), tl.fields[0]!.delay);
        }}
        onTapCell={(at) => {
          if (refusal(level, state, at)) return;
          const next = [...rot];
          next[at] = ((next[at] ?? 0) + 1) & 3;
          setRot(next);
          sounds.play('clack');
          haptics.tap();
        }}
        cellLabel={(at) =>
          t('game.cell', {
            what: t('how.tryIt'),
            row: Math.floor(at / level.w) + 1,
            col: (at % level.w) + 1,
          })
        }
      />
      <View style={styles.status}>
        {solved ? (
          <Animated.View
            entering={calmMotion ? undefined : FadeIn.duration(300)}
            style={styles.done}
          >
            <Ionicons name="checkmark-circle" size={20} color={theme.good} />
            <AppText variant="heading" color={theme.good} accessibilityLiveRegion="polite">
              {t('how.solved')}
            </AppText>
            <Button
              kind="ghost"
              compact
              icon="refresh"
              label={t('game.reset')}
              onPress={() => setRot(level.start)}
            />
          </Animated.View>
        ) : (
          <AppText variant="caption" center>
            {t('how.tryIt')}
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  mini: { alignItems: 'center', gap: 4 },
  status: { minHeight: 40, justifyContent: 'center' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
