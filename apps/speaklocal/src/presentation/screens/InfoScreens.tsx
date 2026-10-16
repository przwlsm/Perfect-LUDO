import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CITIES, LANG_IDS, LANGUAGES } from '@/domain/content/languages';
import { NativeText } from '../components/Bits';
import { AppText, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { Skyline } from '../skyline/Skyline';
import { useContent } from '../state/useContent';
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
  'mic',
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

/** What Speak Local is, where the content stands, and credits (the fonts are SIL OFL). */
export function AboutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { city } = useContent();
  const art = Math.min(width, 640) - 32;
  return (
    <Page title={t('about.title')}>
      <View style={[styles.art, { borderColor: theme.border }]}>
        <Skyline kind={city.skyline} width={art} height={150} />
      </View>
      <Card style={styles.hero}>
        <View style={styles.names}>
          {LANG_IDS.map((l) => (
            <NativeText key={l} lang={l} size={20} color={theme.accentText}>
              {LANGUAGES[l].nativeName}
            </NativeText>
          ))}
        </View>
        <AppText variant="heading">{t('about.lead')}</AppText>
        <AppText color={theme.muted}>{t('about.body')}</AppText>
        <AppText variant="caption">{CITIES.map((c) => t(`cities.${c.id}`)).join(' · ')}</AppText>
      </Card>
      <Card style={styles.section}>
        <AppText variant="heading">{t('about.reviewTitle')}</AppText>
        <AppText color={theme.muted}>{t('about.reviewBody')}</AppText>
      </Card>
      <Card style={styles.section}>
        <AppText variant="heading">{t('about.creditsTitle')}</AppText>
        <AppText color={theme.muted}>{t('about.fonts')}</AppText>
        <AppText color={theme.muted}>{t('about.art')}</AppText>
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
  names: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  art: { height: 150, borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
});
