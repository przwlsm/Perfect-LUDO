import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { lookById } from '@/domain/entities/Look';
import { SHOWCASE } from '@/application/levels/tutorial';
import { BoardPreview } from '../board/BoardPreview';
import { AppText, Card } from '../components/Kit';
import { Page } from '../components/Page';
import { useTheme } from '../theme/ThemeProvider';

const SECTIONS = ['practice', 'line', 'seasons', 'game'] as const;

/** A short, respectful note on the tradition the game borrows its line from. */
export function AboutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const classic = lookById('classic');
  const w = Math.min(width, 640) - 32;
  return (
    <Page title={t('about.title')}>
      <View
        style={styles.art}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('home.heroA11y')}
      >
        <BoardPreview
          level={SHOWCASE}
          width={w}
          height={Math.round(Math.min(w * 0.6, 240))}
          ink={theme.scheme === 'dawn' ? classic.dawn : classic.courtyard}
          palette={theme}
          animate={false}
        />
      </View>
      <AppText variant="body" color={theme.muted}>
        {t('about.lead')}
      </AppText>
      {SECTIONS.map((s) => (
        <Card key={s} style={styles.card}>
          <AppText variant="heading">{t(`about.sections.${s}.title`)}</AppText>
          <AppText variant="body" color={theme.muted}>
            {t(`about.sections.${s}.body`)}
          </AppText>
        </Card>
      ))}
      <AppText variant="caption" center>
        {t('about.thanks')}
      </AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  art: { alignItems: 'center' },
  card: { gap: 8 },
});
