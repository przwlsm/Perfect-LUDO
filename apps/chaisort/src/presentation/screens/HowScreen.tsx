import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { cupThemeById } from '@/domain/entities/CupTheme';
import { CounterPreview, type PreviewCup } from '../counter/CounterPreview';
import { LOOKS } from '../counter/looks';
import { AppText, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { SCENES } from '../components/scenes';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

type Rule = 'pour' | 'match' | 'serve' | 'win' | 'froth' | 'lid' | 'tall' | 'spice';

const STEPS: readonly { key: string; scene: readonly PreviewCup[]; rules: readonly Rule[] }[] = [
  { key: 'pour', scene: SCENES.pour, rules: ['pour', 'match'] },
  { key: 'serve', scene: SCENES.serve, rules: ['serve', 'win'] },
  { key: 'froth', scene: SCENES.froth, rules: ['froth'] },
  { key: 'lid', scene: SCENES.lid, rules: ['lid'] },
  { key: 'tall', scene: SCENES.tall, rules: ['tall'] },
  { key: 'spice', scene: SCENES.spice, rules: ['spice'] },
];

const ICONS: Record<Rule, React.ComponentProps<typeof Ionicons>['name']> = {
  pour: 'hand-left-outline',
  match: 'git-compare-outline',
  serve: 'cafe-outline',
  win: 'receipt-outline',
  froth: 'cloud-outline',
  lid: 'lock-closed-outline',
  tall: 'resize-outline',
  spice: 'flame-outline',
};

/** The whole game in six small counters. */
export function HowScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { calmMotion, settings } = useSettings();
  const ent = useEntitlements();
  const cupTheme = cupThemeById(settings.cups);
  const look = LOOKS[ent.isThemeOpen(cupTheme) ? cupTheme.id : 'kulhad'];
  const w = Math.min(width, 640) - 32 - 36;
  return (
    <Page title={t('how.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('how.lead')}
      </AppText>
      {STEPS.map((step) => (
        <Card key={step.key} style={styles.card}>
          <View style={[styles.scene, { backgroundColor: theme.surfaceRaised }]}>
            <CounterPreview
              cups={step.scene}
              width={w}
              height={Math.round(w * 0.4)}
              look={look}
              palette={theme}
              symbols={settings.symbols}
              calm={calmMotion}
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
        {(
          [
            ['shapes-outline', t('how.rules.marks')],
            ['arrow-undo-outline', t('how.help')],
            ['star-outline', t('how.stars')],
            ['receipt-outline', t('how.daily')],
          ] as const
        ).map(([icon, text]) => (
          <View key={icon} style={styles.rule}>
            <Ionicons name={icon} size={20} color={theme.accentText} />
            <AppText variant="body" style={styles.flex}>
              {text}
            </AppText>
          </View>
        ))}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  scene: { alignItems: 'center', borderRadius: 18, overflow: 'hidden', paddingTop: 4 },
  rule: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
