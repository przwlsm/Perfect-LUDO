import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, Card, type IconName } from '../components/Kit';
import { Page } from '../components/Page';
import { useTheme } from '../theme/ThemeProvider';

const POINTS: {
  key: 'free' | 'noInterrupt' | 'videos' | 'plus' | 'mark' | 'tips' | 'data';
  icon: IconName;
}[] = [
  { key: 'free', icon: 'gift-outline' },
  { key: 'noInterrupt', icon: 'eye-off-outline' },
  { key: 'videos', icon: 'play-circle-outline' },
  { key: 'plus', icon: 'sparkles-outline' },
  { key: 'mark', icon: 'water-outline' },
  { key: 'tips', icon: 'cafe-outline' },
  { key: 'data', icon: 'phone-portrait-outline' },
];

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

const SECTIONS = [
  'collect',
  'photos',
  'device',
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
      <AppText variant="body" color={theme.muted}>
        {t('privacy.intro')}
      </AppText>
      {SECTIONS.map((s) => (
        <Card key={s} style={styles.section}>
          <AppText variant="heading">{t(`privacy.sections.${s}.title`)}</AppText>
          <AppText variant="body" color={theme.muted}>
            {t(`privacy.sections.${s}.body`)}
          </AppText>
        </Card>
      ))}
    </Page>
  );
}

const FONTS_CREDITS = [
  'baloo',
  'yatra',
  'kalam',
  'vibes',
  'playfair',
  'fraunces',
  'nunito',
] as const;

/** What Utsav is, and credit for the fonts it draws with (SIL OFL). */
export function AboutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Page title={t('about.title')}>
      <AppText variant="body" color={theme.muted}>
        {t('about.body')}
      </AppText>
      <Card style={styles.section}>
        <AppText variant="body">{t('about.review')}</AppText>
      </Card>
      <Card style={styles.section}>
        <AppText variant="heading">{t('about.fontsTitle')}</AppText>
        <AppText variant="caption">{t('about.fontsBody')}</AppText>
        {FONTS_CREDITS.map((k) => (
          <View key={k} style={styles.point}>
            <Ionicons name="text-outline" size={18} color={theme.accentText} />
            <AppText variant="body" style={styles.flex}>
              {t(`about.fonts.${k}`)}
            </AppText>
          </View>
        ))}
      </Card>
      <Card style={styles.section}>
        <AppText variant="heading">{t('about.soundsTitle')}</AppText>
        <AppText variant="body" color={theme.muted}>
          {t('about.soundsBody')}
        </AppText>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 8 },
  flex: { flex: 1 },
});
