import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { newCard } from '@/application/card';
import { templatesFor } from '@/application/catalogue/templates';
import { isOccasionId } from '@/domain/entities/Occasion';
import { CardThumb } from '../cards/CardThumb';
import { AppText, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Every design for one occasion, as a gallery of finished cards. */
export function OccasionScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { settings, cardLanguage, calmMotion } = useSettings();
  const { plus, passLeft } = useEntitlements();

  if (!isOccasionId(id)) {
    return (
      <Page title={t('app.full')}>
        <AppText variant="body">{t('occasion.notFound')}</AppText>
      </Page>
    );
  }
  const templates = templatesFor(id);
  const cell = Math.floor((Math.min(width, 640) - 32 - 14) / 2);
  return (
    <Page title={t(`occasions.${id}.name`)}>
      <AppText variant="body" color={theme.muted}>
        {t(`occasions.${id}.blurb`)} {t('occasion.designs', { count: templates.length })}
      </AppText>
      <View style={styles.grid}>
        {templates.map((template, i) => {
          const pass = template.premium && !plus && passLeft(template) > 0;
          const locked = template.premium && !plus && !pass;
          const state = pass
            ? t('occasion.statePass')
            : template.premium && !plus
              ? t('occasion.statePlus')
              : t('occasion.stateFree');
          return (
            <Animated.View
              key={template.id}
              entering={
                calmMotion
                  ? undefined
                  : FadeInDown.delay(40 + i * 60)
                      .springify()
                      .damping(18)
              }
            >
              <Pressy
                onPress={() =>
                  router.push({
                    pathname: '/editor',
                    params: { template: template.id, seed: String(i) },
                  })
                }
                accessibilityLabel={t('occasion.openDesign', {
                  design: t(`designs.${template.design}`),
                  state,
                })}
                style={{ width: cell }}
              >
                <CardThumb
                  spec={newCard(template, cardLanguage, settings.name, i)}
                  width={cell}
                  radius={20}
                  urgent={i < 2}
                />
                {(locked || pass) && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.glass, borderColor: theme.glassBorder },
                    ]}
                  >
                    <Ionicons
                      name={pass ? 'time-outline' : 'sparkles'}
                      size={13}
                      color={theme.accentText}
                    />
                    <AppText variant="caption" color={theme.text} style={styles.badgeText}>
                      {pass ? t('occasion.passBadge') : t('occasion.plusBadge')}
                    </AppText>
                  </View>
                )}
                <AppText variant="heading" style={styles.label} numberOfLines={1}>
                  {t(`designs.${template.design}`)}
                </AppText>
              </Pressy>
            </Animated.View>
          );
        })}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  label: { marginTop: 8, paddingHorizontal: 2 },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeText: { fontWeight: '700' },
});
