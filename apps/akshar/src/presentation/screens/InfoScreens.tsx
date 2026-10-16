import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SCRIPTS } from '@/domain/entities/scripts';
import { SAMPLE, ScriptText } from '../components/Bits';
import { AppText, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useTheme } from '../theme/ThemeProvider';

const POINTS = [
  { key: 'free', icon: 'gift-outline' },
  { key: 'noInterrupt', icon: 'eye-off-outline' },
  { key: 'videos', icon: 'play-circle-outline' },
  { key: 'plus', icon: 'sparkles-outline' },
  { key: 'tips', icon: 'cafe-outline' },
  { key: 'data', icon: 'phone-portrait-outline' },
  { key: 'adsData', icon: 'shield-checkmark-outline' },
  { key: 'kids', icon: 'people-outline' },
] as const;

/** Plain words on every way the app earns money, and what it never does. */
export function MoneyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Page title={t('money.title')}>
      <AppText color={theme.muted}>{t('money.intro')}</AppText>
      <Card style={styles.list}>
        {POINTS.map((p) => (
          <View key={p.key} style={styles.point}>
            <View style={[styles.icon, { backgroundColor: theme.surfaceRaised }]}>
              <Ionicons name={p.icon} size={20} color={theme.accentText} />
            </View>
            <AppText style={styles.flex}>{t(`money.points.${p.key}`)}</AppText>
          </View>
        ))}
      </Card>
    </Page>
  );
}

const SECTIONS = [
  'collect',
  'device',
  'speech',
  'ads',
  'purchases',
  'children',
  'contact',
] as const;

/** The privacy policy, readable offline inside the app. */
export function PrivacyScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Page title={t('privacy.title')}>
      <AppText variant="caption">{t('privacy.updated')}</AppText>
      <AppText color={theme.muted}>{t('privacy.intro')}</AppText>
      {SECTIONS.map((s) => (
        <Card key={s} style={styles.section}>
          <AppText variant="heading">{t(`privacy.sections.${s}.title`)}</AppText>
          <AppText color={theme.muted}>{t(`privacy.sections.${s}.body`)}</AppText>
        </Card>
      ))}
    </Page>
  );
}

/** What Akshar is, a note on accuracy, and credits (the fonts are SIL OFL). */
export function AboutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Page title={t('about.title')}>
      <Card style={styles.hero}>
        <View style={styles.letters}>
          {SCRIPTS.map((s) => (
            <ScriptText key={s.id} script={s} size={26} color={theme.accentText}>
              {SAMPLE[s.id]}
            </ScriptText>
          ))}
        </View>
        <AppText variant="heading">{t('about.lead')}</AppText>
        <AppText color={theme.muted}>{t('about.body')}</AppText>
      </Card>
      <Card style={styles.section}>
        <AppText variant="heading">{t('about.accuracyTitle')}</AppText>
        <AppText color={theme.muted}>{t('about.accuracyBody')}</AppText>
      </Card>
      <Card style={styles.section}>
        <AppText variant="heading">{t('about.creditsTitle')}</AppText>
        <AppText color={theme.muted}>{t('about.fonts')}</AppText>
        <AppText color={theme.muted}>{t('about.sounds')}</AppText>
      </Card>
      <AppText variant="caption" center>
        {t('about.version', { version: Constants.expoConfig?.version ?? '' })}
      </AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  point: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  section: { gap: 8 },
  hero: { gap: 10 },
  letters: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
});
