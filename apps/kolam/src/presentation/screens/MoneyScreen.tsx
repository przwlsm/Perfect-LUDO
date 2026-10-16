import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useTheme } from '../theme/ThemeProvider';

const POINTS = [
  { key: 'free', icon: 'gift-outline' },
  { key: 'noInterrupt', icon: 'eye-off-outline' },
  { key: 'videos', icon: 'play-circle-outline' },
  { key: 'hints', icon: 'bulb-outline' },
  { key: 'plus', icon: 'sparkles-outline' },
  { key: 'tips', icon: 'cafe-outline' },
  { key: 'data', icon: 'phone-portrait-outline' },
  { key: 'adsData', icon: 'shield-checkmark-outline' },
  { key: 'kids', icon: 'heart-outline' },
] as const;

/** Plain words on every way the app earns money, and what it never does. */
export function MoneyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Page title={t('money.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('money.intro')}
      </AppText>
      <Card style={styles.list}>
        {POINTS.map((p) => (
          <View key={p.key} style={styles.point}>
            <View style={[styles.icon, { backgroundColor: theme.surfaceRaised }]}>
              <Ionicons name={p.icon} size={20} color={theme.accentText} />
            </View>
            <AppText variant="body" style={styles.flex}>
              {t(`money.points.${p.key}`)}
            </AppText>
          </View>
        ))}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  point: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
