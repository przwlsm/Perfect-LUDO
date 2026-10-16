import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useTheme } from '../theme/ThemeProvider';

const SECTIONS = ['collect', 'device', 'voice', 'ads', 'purchases', 'children', 'contact'] as const;

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
        <Card key={s} style={styles.card}>
          <AppText variant="heading">{t(`privacy.sections.${s}.title`)}</AppText>
          <AppText variant="body" color={theme.muted}>
            {t(`privacy.sections.${s}.body`)}
          </AppText>
        </Card>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
});
