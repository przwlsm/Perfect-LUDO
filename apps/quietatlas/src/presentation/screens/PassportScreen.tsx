import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { stampCount, totalMinutes, type Stamp } from '@/domain/entities/Passport';
import { flagOf, TOYS, type Toy } from '@/domain/entities/Toy';
import { AppText, Card, Pressy } from '../components/Kit';
import { Page } from '../components/Page';
import { usePassport } from '../state/PassportProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

export function PassportScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { passport } = usePassport();
  const { calmMotion } = useSettings();
  const stamps = stampCount(passport);
  return (
    <Page title={t('passport.title')}>
      <Card style={styles.summary}>
        <Text style={styles.globe} allowFontScaling={false}>
          🌍
        </Text>
        <View style={styles.flex}>
          <AppText variant="body" color={theme.muted}>
            {t('passport.lead')}
          </AppText>
          <AppText variant="heading" color={theme.accentText}>
            {t('passport.total', { minutes: totalMinutes(passport), stamps })}
          </AppText>
        </View>
      </Card>
      {stamps === 0 && (
        <AppText variant="body" center color={theme.muted}>
          {t('passport.empty')}
        </AppText>
      )}
      <View style={styles.grid}>
        {TOYS.map((toy, i) => (
          <Animated.View
            key={toy.id}
            entering={calmMotion ? undefined : FadeInUp.delay(i * 70).springify()}
            style={styles.cell}
          >
            <StampCard toy={toy} stamp={passport[toy.id]} locale={i18n.language} />
          </Animated.View>
        ))}
      </View>
    </Page>
  );
}

function StampCard({ toy, stamp, locale }: { toy: Toy; stamp: Stamp | undefined; locale: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tilt = ((toy.lat * 7 + toy.lon) % 14) - 7;
  const name = t(`toys.${toy.id}.name`);
  const country = t(`toys.${toy.id}.country`);
  return (
    <Pressy
      onPress={() => router.push({ pathname: '/toy/[id]', params: { id: toy.id } })}
      accessibilityLabel={stamp ? `${name}, ${country}` : `${name}, ${t('passport.locked')}`}
      style={[styles.page, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View
        style={[
          styles.stamp,
          {
            borderColor: stamp ? toy.hue : theme.faint,
            opacity: stamp ? 1 : 0.4,
            transform: [{ rotate: `${tilt}deg` }],
          },
        ]}
      >
        <Text style={styles.flag} allowFontScaling={false}>
          {stamp ? flagOf(toy.country) : toy.emblem}
        </Text>
        <AppText variant="label" center color={stamp ? toy.hue : theme.faint} numberOfLines={2}>
          {country}
        </AppText>
      </View>
      <AppText variant="heading" center numberOfLines={2}>
        {name}
      </AppText>
      {stamp ? (
        <>
          <AppText variant="caption" center>
            {t('passport.since', {
              date: new Date(stamp.since).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            })}
          </AppText>
          <AppText variant="caption" center>
            {t('passport.visits', { count: Math.max(1, stamp.visits) })} ·{' '}
            {t('passport.minutes', { count: Math.floor(stamp.seconds / 60) })}
          </AppText>
        </>
      ) : (
        <AppText variant="caption" center color={theme.faint}>
          {t('passport.locked')}
        </AppText>
      )}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  globe: { fontSize: 38 },
  flex: { flex: 1, gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  page: { borderRadius: 20, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6 },
  stamp: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 6,
  },
  flag: { fontSize: 34 },
});
