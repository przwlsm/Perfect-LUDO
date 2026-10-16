import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Level } from '@/domain/entities/Board';
import { BoardPreview } from '../board/BoardPreview';
import { AppText, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { SCENES } from '../components/scenes';
import { useSettings } from '../state/SettingsProvider';
import { LOOKS } from '../theme/festivals';
import { useTheme } from '../theme/ThemeProvider';

type Rule =
  'flame' | 'mirror' | 'prism' | 'glass' | 'mix' | 'exact' | 'wall' | 'oneway' | 'sleeper';

const STEPS: readonly { scene: Level; rules: readonly Rule[] }[] = [
  { scene: SCENES.mirror, rules: ['flame', 'mirror'] },
  { scene: SCENES.prism, rules: ['prism'] },
  { scene: SCENES.glass, rules: ['glass', 'exact'] },
  { scene: SCENES.mix, rules: ['mix'] },
  { scene: SCENES.rules, rules: ['wall', 'oneway', 'sleeper'] },
];

const ICONS: Record<Rule, React.ComponentProps<typeof Ionicons>['name']> = {
  flame: 'flame-outline',
  mirror: 'swap-horizontal-outline',
  prism: 'git-branch-outline',
  glass: 'color-filter-outline',
  mix: 'color-palette-outline',
  exact: 'checkmark-done-outline',
  wall: 'square-outline',
  oneway: 'arrow-forward-circle-outline',
  sleeper: 'moon-outline',
};

/** The whole game in five small, living boards. */
export function HowScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { calmMotion, settings } = useSettings();
  const w = Math.min(width, 640) - 32 - 36;
  return (
    <Page title={t('how.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('how.lead')}
      </AppText>
      {STEPS.map((step) => (
        <Card key={step.scene.id} style={styles.card}>
          <View style={styles.scene}>
            <BoardPreview
              level={step.scene}
              width={w}
              height={Math.min(
                Math.round(w * 0.5),
                Math.round((w / step.scene.w) * step.scene.h) + 24,
              )}
              look={LOOKS.diwali}
              scheme={theme.scheme}
              calm={calmMotion}
              colourAid={settings.colourAid}
            />
          </View>
          {step.rules.map((r) => (
            <View key={r} style={styles.rule}>
              <Ionicons name={ICONS[r]} size={20} color={theme.accentText} />
              <AppText variant="body" style={styles.flex}>
                {t(`how.rules.${r}`)}
              </AppText>
            </View>
          ))}
        </Card>
      ))}
      <Card style={styles.card}>
        <View style={styles.rule}>
          <Ionicons name="star-outline" size={20} color={theme.accentText} />
          <AppText variant="body" style={styles.flex}>
            {t('how.stars')}
          </AppText>
        </View>
        <View style={styles.rule}>
          <Ionicons name="calendar-outline" size={20} color={theme.accentText} />
          <AppText variant="body" style={styles.flex}>
            {t('how.daily')}
          </AppText>
        </View>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  scene: { alignItems: 'center' },
  rule: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
