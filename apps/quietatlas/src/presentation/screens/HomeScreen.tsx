import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { stampCount, totalMinutes } from '@/domain/entities/Passport';
import {
  COMING_SOON,
  flagOf,
  TOYS,
  toyOfTheDay,
  type Destination,
  type Toy,
} from '@/domain/entities/Toy';
import { AppText, Button, Card, IconButton, Pressy, Sheet } from '../components/Kit';
import { Sky } from '../components/Sky';
import { Globe } from '../globe/Globe';
import { usePassport } from '../state/PassportProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** Content never stretches wider than this on tablets and foldables. */
const MAX_WIDTH = 640;

function greetingKey(hour: number) {
  if (hour < 5) return 'greeting.night' as const;
  if (hour < 12) return 'greeting.morning' as const;
  if (hour < 18) return 'greeting.afternoon' as const;
  if (hour < 22) return 'greeting.evening' as const;
  return 'greeting.night' as const;
}

export function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { calmMotion } = useSettings();
  const { passport } = usePassport();
  const today = useMemo(() => toyOfTheDay(new Date()), []);
  const [soon, setSoon] = useState<Destination | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; key: string }>({
    lat: today.lat,
    lon: today.lon,
    key: today.id,
  });

  const contentWidth = Math.min(width, MAX_WIDTH);
  const globeSize = Math.min(contentWidth - 24, 400);
  const open = (toy: Toy) => router.push({ pathname: '/toy/[id]', params: { id: toy.id } });
  const enter = (i: number) =>
    calmMotion
      ? undefined
      : FadeInDown.delay(80 + i * 70)
          .springify()
          .damping(18);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Sky />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, width: contentWidth },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Text style={styles.brandMark} allowFontScaling={false}>
              🌍
            </Text>
            <AppText variant="heading" accessibilityRole="header" style={styles.brandName}>
              {t('app.name')}
            </AppText>
          </View>
          <View style={styles.topActions}>
            <IconButton
              icon="book-outline"
              label={t('home.passport')}
              onPress={() => router.push('/passport')}
            />
            <IconButton
              icon="settings-outline"
              label={t('home.settings')}
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        <Animated.View entering={enter(0)} style={styles.greeting}>
          <AppText variant="label" color={theme.accentText}>
            {t(greetingKey(new Date().getHours()))}
          </AppText>
          <AppText variant="title">{t('home.question')}</AppText>
        </Animated.View>

        <View style={styles.globeWrap}>
          <Globe
            size={globeSize}
            focus={focus}
            onToy={(toy) => {
              setFocus({ lat: toy.lat, lon: toy.lon, key: `${toy.id}-${Date.now()}` });
              open(toy);
            }}
            onSoon={(d) => {
              setFocus({ lat: d.lat, lon: d.lon, key: `${d.id}-${Date.now()}` });
              setSoon(d);
            }}
          />
          <AppText variant="caption" center color={theme.faint}>
            {t('home.globeHint')}
          </AppText>
        </View>

        <Animated.View entering={enter(1)}>
          <TodayCard toy={today} onOpen={() => open(today)} />
        </Animated.View>

        <AppText variant="label" style={styles.section}>
          {t('home.destinations')}
        </AppText>
        <View style={styles.grid}>
          {TOYS.map((toy, i) => (
            <Animated.View key={toy.id} entering={enter(2 + i)} style={styles.gridCell}>
              <ToyCard toy={toy} stamped={!!passport[toy.id]} onOpen={() => open(toy)} />
            </Animated.View>
          ))}
        </View>

        <AppText variant="label" style={styles.section}>
          {t('home.soon')}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {COMING_SOON.map((d) => (
            <Pressy
              key={d.id}
              onPress={() => {
                setFocus({ lat: d.lat, lon: d.lon, key: `${d.id}-${Date.now()}` });
                setSoon(d);
              }}
              accessibilityLabel={t('home.soonA11y', {
                toy: t(`soon.${d.id}.name`),
                country: t(`soon.${d.id}.country`),
              })}
              style={[
                styles.chip,
                { backgroundColor: theme.glass, borderColor: theme.glassBorder },
              ]}
            >
              <Text style={styles.chipEmblem} allowFontScaling={false}>
                {d.emblem}
              </Text>
              <AppText variant="caption" color={theme.text}>
                {t(`soon.${d.id}.name`)}
              </AppText>
            </Pressy>
          ))}
        </ScrollView>

        <Pressy onPress={() => router.push('/passport')} style={styles.cardSpace}>
          <Card style={styles.passportCard}>
            <View style={[styles.passportIcon, { backgroundColor: theme.surfaceRaised }]}>
              <Ionicons name="book" size={22} color={theme.accentText} />
            </View>
            <View style={styles.flex}>
              <AppText variant="heading">{t('home.passport')}</AppText>
              <AppText variant="caption">
                {t('home.stamps', { count: stampCount(passport), total: TOYS.length })} ·{' '}
                {t('home.minutes', { count: totalMinutes(passport) })}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.faint} />
          </Card>
        </Pressy>

        <Card style={[styles.cardSpace, styles.supportCard]}>
          <View style={styles.supportHead}>
            <Text style={styles.supportIcon} allowFontScaling={false}>
              🍵
            </Text>
            <AppText variant="heading" style={styles.flex}>
              {t('home.supportTitle')}
            </AppText>
          </View>
          <AppText variant="body" color={theme.muted}>
            {t('home.supportBody')}
          </AppText>
          <Button
            kind="secondary"
            icon="heart"
            label={t('home.supportCta')}
            onPress={() => router.push('/support')}
          />
        </Card>
      </ScrollView>

      <Sheet
        visible={soon !== null}
        onClose={() => setSoon(null)}
        title={
          soon
            ? t('home.soonTitle', {
                toy: t(`soon.${soon.id}.name`),
                country: t(`soon.${soon.id}.country`),
              })
            : ''
        }
      >
        {soon && (
          <>
            <Text style={styles.soonEmblem} allowFontScaling={false}>
              {soon.emblem} {flagOf(soon.country)}
            </Text>
            <AppText variant="body" color={theme.muted}>
              {t('home.soonBody')}
            </AppText>
            <Button label={t('common.close')} kind="secondary" onPress={() => setSoon(null)} />
          </>
        )}
      </Sheet>
    </View>
  );
}

function TodayCard({ toy, onOpen }: { toy: Toy; onOpen: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressy onPress={onOpen} accessibilityLabel={`${t('home.today')}: ${t(`toys.${toy.id}.name`)}`}>
      <View
        style={[
          styles.today,
          { borderColor: theme.border, boxShadow: `0 16px 40px ${theme.shadow}` },
        ]}
      >
        <LinearGradient
          colors={[`${toy.hue}55`, theme.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[styles.todayEmblem, { backgroundColor: `${toy.hue}33`, borderColor: toy.hue }]}
        >
          <Text style={styles.todayEmblemText} allowFontScaling={false}>
            {toy.emblem}
          </Text>
        </View>
        <View style={styles.flex}>
          <AppText variant="label" color={theme.accentText}>
            {t('home.today')}
          </AppText>
          <AppText variant="title">{t(`toys.${toy.id}.name`)}</AppText>
          <AppText variant="caption">
            {flagOf(toy.country)} {t(`toys.${toy.id}.country`)}
          </AppText>
          <AppText variant="body" color={theme.muted} style={styles.todayLine}>
            {t(`toys.${toy.id}.line`)}
          </AppText>
          <View style={[styles.beginPill, { backgroundColor: theme.accent }]}>
            <AppText variant="heading" color={theme.onAccent}>
              {t('home.begin')}
            </AppText>
            <Ionicons name="arrow-forward" size={18} color={theme.onAccent} />
          </View>
        </View>
      </View>
    </Pressy>
  );
}

function ToyCard({ toy, stamped, onOpen }: { toy: Toy; stamped: boolean; onOpen: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressy
      onPress={onOpen}
      accessibilityLabel={`${t(`toys.${toy.id}.name`)}, ${t(`toys.${toy.id}.country`)}`}
      style={[
        styles.toyCard,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: `0 8px 22px ${theme.shadow}`,
        },
      ]}
    >
      <View
        style={[
          styles.toyEmblem,
          { backgroundColor: `${toy.hue}26`, boxShadow: `0 0 22px ${toy.hue}55` },
        ]}
      >
        <Text style={styles.toyEmblemText} allowFontScaling={false}>
          {toy.emblem}
        </Text>
      </View>
      <AppText variant="heading" numberOfLines={2}>
        {t(`toys.${toy.id}.name`)}
      </AppText>
      <AppText variant="caption" numberOfLines={1}>
        {flagOf(toy.country)} {t(`toys.${toy.id}.country`)}
      </AppText>
      {stamped && (
        <View style={[styles.stampBadge, { borderColor: toy.hue }]}>
          <Ionicons name="checkmark" size={12} color={toy.hue} />
        </View>
      )}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignSelf: 'center', paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { fontSize: 22 },
  brandName: { fontSize: 19 },
  topActions: { flexDirection: 'row', gap: 10 },
  greeting: { marginTop: 18, gap: 4 },
  globeWrap: { alignItems: 'center', marginTop: 6, marginBottom: 18, gap: 4 },
  today: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    gap: 16,
    overflow: 'hidden',
  },
  todayEmblem: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayEmblemText: { fontSize: 36 },
  todayLine: { marginTop: 6 },
  beginPill: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    minHeight: 44,
    borderRadius: 22,
  },
  section: { marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  gridCell: { width: '50%', padding: 6 },
  toyCard: { borderRadius: 22, borderWidth: 1, padding: 14, gap: 4, minHeight: 150 },
  toyEmblem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toyEmblemText: { fontSize: 27 },
  stampBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  chips: { gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipEmblem: { fontSize: 18 },
  cardSpace: { marginTop: 24 },
  passportCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  passportIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCard: { gap: 12 },
  supportHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  supportIcon: { fontSize: 26 },
  soonEmblem: { fontSize: 40 },
  flex: { flex: 1 },
});
