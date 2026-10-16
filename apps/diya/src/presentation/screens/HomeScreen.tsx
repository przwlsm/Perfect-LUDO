import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { festivalById } from '@/domain/entities/Festival';
import { todayNumber } from '@/application/levels/daily';
import { chapterOf, LEVEL_COUNT } from '@/application/levels/levels';
import { BoardPreview } from '../board/BoardPreview';
import { CHAPTER_KEYS } from '../components/chapters';
import { AppText, Button, Card, IconButton, Pressy } from '../components/Kit';
import { NightSky } from '../components/NightSky';
import { HERO } from '../components/scenes';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useRecord } from '../state/RecordProvider';
import { useSettings } from '../state/SettingsProvider';
import { LOOKS } from '../theme/festivals';
import { useTheme } from '../theme/ThemeProvider';

const MAX_WIDTH = 640;

function greetingKey(hour: number) {
  if (hour < 5) return 'home.greeting.night' as const;
  if (hour < 12) return 'home.greeting.morning' as const;
  if (hour < 18) return 'home.greeting.afternoon' as const;
  if (hour < 22) return 'home.greeting.evening' as const;
  return 'home.greeting.night' as const;
}

export function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { calmMotion, settings } = useSettings();
  const rec = useRecord();
  const ent = useEntitlements();
  const contentWidth = Math.min(width, MAX_WIDTH);
  const festival = festivalById(settings.festival);
  const look = LOOKS[ent.isFestivalOpen(festival) ? festival.id : 'diwali'];

  const solved = Object.keys(rec.record.progress.stars).map(Number);
  const furthest = solved.length ? Math.max(...solved) : 0;
  const lastUnsolved = rec.starsOf(rec.record.last) === 0 ? rec.record.last : null;
  const next = Math.min(LEVEL_COUNT, lastUnsolved ?? furthest + 1);
  const fresh = solved.length === 0;
  const allDone = solved.length >= LEVEL_COUNT;
  const today = todayNumber(new Date());
  const dailyDone = !!rec.record.dailies[today];
  const enter = (i: number) =>
    calmMotion
      ? undefined
      : FadeInDown.delay(60 + i * 70)
          .springify()
          .damping(18);
  const heroW = contentWidth - 32;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <NightSky />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, width: contentWidth },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Ionicons name="flame" size={24} color={theme.accent} />
            <AppText variant="title" accessibilityRole="header" style={styles.brandName}>
              {t('app.name')}
            </AppText>
          </View>
          <IconButton
            icon="help-circle-outline"
            label={t('home.how')}
            onPress={() => router.push('/how')}
          />
          <IconButton
            icon="settings-outline"
            label={t('home.settings')}
            onPress={() => router.push('/settings')}
          />
        </View>

        <Animated.View entering={enter(0)} style={styles.greeting}>
          <AppText variant="label" color={theme.accentText}>
            {t(greetingKey(new Date().getHours()))}
          </AppText>
          <AppText variant="display">{t('app.tagline')}</AppText>
          <AppText variant="body" color={theme.muted}>
            {t('home.lead')}
          </AppText>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.hero}>
          <BoardPreview
            level={HERO}
            width={heroW}
            height={Math.round(heroW * 0.62)}
            look={look}
            scheme={theme.scheme}
            calm={calmMotion}
          />
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <Card style={styles.continue}>
            <View style={styles.continueHead}>
              <View style={styles.flex}>
                <AppText variant="label" color={theme.accentText}>
                  {allDone ? t('home.allDone') : fresh ? t('home.levels') : t('home.continue')}
                </AppText>
                <AppText variant="title">{t('home.level', { n: next })}</AppText>
              </View>
              <AppText variant="caption">{t(CHAPTER_KEYS[chapterOf(next)]!)}</AppText>
            </View>
            <Button
              icon="play"
              label={fresh ? t('home.start') : t('home.continue')}
              onPress={() => router.push({ pathname: '/play/[id]', params: { id: String(next) } })}
            />
          </Card>
        </Animated.View>

        <Animated.View entering={enter(3)}>
          <Pressy
            onPress={() => router.push('/daily')}
            accessibilityLabel={`${t('home.daily')}, ${t('home.dailyNumber', { n: today })}`}
          >
            <Card style={styles.daily}>
              <View
                style={[
                  styles.dailyIcon,
                  { backgroundColor: dailyDone ? theme.accent : theme.surfaceRaised },
                ]}
              >
                <Ionicons
                  name={dailyDone ? 'checkmark' : 'calendar'}
                  size={24}
                  color={dailyDone ? theme.onAccent : theme.accentText}
                />
              </View>
              <View style={styles.flex}>
                <AppText variant="heading">
                  {t('home.daily')} · {t('home.dailyNumber', { n: today })}
                </AppText>
                <AppText variant="caption">
                  {dailyDone ? t('home.dailySolved') : t('home.dailyNew')}
                </AppText>
                <AppText variant="caption" color={theme.accentText}>
                  {rec.streak > 0
                    ? `🔥 ${t('home.streak', { count: rec.streak })}`
                    : t('home.noStreak')}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.faint} />
            </Card>
          </Pressy>
        </Animated.View>

        <Animated.View entering={enter(4)} style={styles.tiles}>
          <Tile
            icon="grid"
            title={t('home.levels')}
            line={t('home.levelsSub', { stars: rec.totalStars, total: LEVEL_COUNT * 3 })}
            onPress={() => router.push('/levels')}
          />
          <Tile
            icon="color-palette"
            title={t('home.themes')}
            line={t(`themes.names.${look.id}`)}
            onPress={() => router.push('/themes')}
          />
        </Animated.View>

        <Animated.View entering={enter(5)}>
          <Pressy onPress={() => router.push('/support')} accessibilityLabel={t('home.support')}>
            <Card style={styles.support}>
              <Ionicons name="heart" size={22} color={theme.accentText} />
              <View style={styles.flex}>
                <AppText variant="heading">{t('home.support')}</AppText>
                <AppText variant="caption">{t('home.supportLine')}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.faint} />
            </Card>
          </Pressy>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Tile({
  icon,
  title,
  line,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  line: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressy onPress={onPress} accessibilityLabel={`${title}, ${line}`} style={styles.flex}>
      <Card style={styles.tile}>
        <View style={[styles.tileIcon, { backgroundColor: theme.surfaceRaised }]}>
          <Ionicons name={icon} size={22} color={theme.accentText} />
        </View>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" numberOfLines={2}>
          {line}
        </AppText>
      </Card>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName: { letterSpacing: 0.5 },
  greeting: { gap: 4, marginTop: 4 },
  hero: { alignItems: 'center', marginVertical: 2 },
  continue: { gap: 14 },
  continueHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dailyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { gap: 6, minHeight: 132 },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  support: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1 },
});
