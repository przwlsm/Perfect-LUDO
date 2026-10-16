import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { newCard } from '@/application/card';
import { heroTemplate, occasionsInOrder, popularNow } from '@/application/catalogue/templates';
import { searchOccasions } from '@/application/search';
import type { CardSpec } from '@/domain/entities/Card';
import { OCCASION_IDS, type OccasionId } from '@/domain/entities/Occasion';
import { CardThumb } from '../cards/CardThumb';
import { AppText, Button, Card, IconButton, Pressy } from '../components/Kit';
import { useCards } from '../state/CardsProvider';
import { useSettings } from '../state/SettingsProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

const MAX_WIDTH = 640;

export function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings, calmMotion, cardLanguage } = useSettings();
  const { cards } = useCards();
  const [query, setQuery] = useState('');

  const contentWidth = Math.min(width, MAX_WIDTH);
  const inner = contentWidth - 32;
  const popularWidth = Math.min(250, Math.round(inner * 0.64));
  const cell = Math.floor((inner - 14) / 2);
  const now = useMemo(() => new Date(), []);
  const popular = useMemo(() => popularNow(now), [now]);
  const order = useMemo(() => occasionsInOrder(now), [now]);
  const names = useMemo(
    () =>
      Object.fromEntries(OCCASION_IDS.map((id) => [id, t(`occasions.${id}.name`)])) as Record<
        OccasionId,
        string
      >,
    [t],
  );
  const results = useMemo(() => searchOccasions(query, names), [query, names]);
  const searching = query.trim().length > 0;

  const heroSpec = (id: OccasionId, i: number, words: boolean): CardSpec => {
    const spec = newCard(heroTemplate(id), cardLanguage, words ? settings.name : '', i);
    return words ? spec : { ...spec, message: '', from: '' };
  };
  const enter = (i: number) =>
    calmMotion
      ? undefined
      : FadeInDown.delay(60 + i * 60)
          .springify()
          .damping(18);
  const openOccasion = (id: OccasionId) =>
    router.push({ pathname: '/occasion/[id]', params: { id } });

  const grid = (ids: readonly OccasionId[]) => (
    <View style={styles.grid}>
      {ids.map((id, i) => (
        <Animated.View key={id} entering={enter(Math.min(i, 8) + 3)}>
          <Pressy
            onPress={() => openOccasion(id)}
            accessibilityLabel={t('home.openOccasion', { name: names[id] })}
            style={{ width: cell }}
          >
            <CardThumb spec={heroSpec(id, i, false)} width={cell} radius={20} />
            <AppText variant="heading" style={styles.tileLabel} numberOfLines={1}>
              {names[id]}
            </AppText>
          </Pressy>
        </Animated.View>
      ))}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={[...theme.glow]} style={styles.glow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 36, width: contentWidth },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View
            style={styles.brand}
            accessible
            accessibilityRole="header"
            accessibilityLabel={t('app.full')}
          >
            <Text style={[styles.wordmark, { color: theme.accentText }]} allowFontScaling={false}>
              {t('app.name')}
            </Text>
            <AppText variant="caption" color={theme.muted}>
              {t('app.tagline')}
            </AppText>
          </View>
          <IconButton
            icon="albums-outline"
            label={t('home.myCards')}
            onPress={() => router.push('/cards')}
          />
          <IconButton
            icon="settings-outline"
            label={t('home.settings')}
            onPress={() => router.push('/settings')}
          />
        </View>

        <Animated.View entering={enter(0)}>
          <AppText variant="title">{t('home.hello')}</AppText>
        </Animated.View>

        <View
          style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="search" size={20} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('home.search')}
            placeholderTextColor={theme.faint}
            accessibilityLabel={t('home.searchA11y')}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            autoCorrect={false}
            maxFontSizeMultiplier={1.6}
          />
          {searching && (
            <IconButton
              icon="close"
              label={t('home.clearSearch')}
              size={36}
              glass={false}
              onPress={() => setQuery('')}
            />
          )}
        </View>

        {searching ? (
          results.length > 0 ? (
            grid(results)
          ) : (
            <AppText variant="body" color={theme.muted} center style={styles.empty}>
              {t('home.noResults', { query: query.trim() })}
            </AppText>
          )
        ) : (
          <>
            <AppText variant="label" style={styles.section}>
              {t('home.popular')}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popular}
              style={styles.bleed}
              snapToInterval={popularWidth + 14}
              decelerationRate="fast"
            >
              {popular.map((id, i) => (
                <Animated.View key={id} entering={enter(i + 1)}>
                  <Pressy
                    onPress={() =>
                      router.push({
                        pathname: '/editor',
                        params: { template: heroTemplate(id).id, seed: String(i) },
                      })
                    }
                    accessibilityLabel={t('home.makeCard', { name: names[id] })}
                    style={{ width: popularWidth }}
                  >
                    <CardThumb
                      spec={heroSpec(id, i, true)}
                      width={popularWidth}
                      radius={24}
                      urgent={i < 2}
                    />
                    <AppText variant="heading" style={styles.tileLabel} numberOfLines={1}>
                      {names[id]}
                    </AppText>
                  </Pressy>
                </Animated.View>
              ))}
            </ScrollView>

            {cards.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <AppText variant="label" style={styles.flex}>
                    {t('home.recent')}
                  </AppText>
                  <Button
                    kind="ghost"
                    compact
                    label={t('common.seeAll')}
                    onPress={() => router.push('/cards')}
                  />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popular}
                  style={styles.bleed}
                >
                  {cards.slice(0, 8).map((card) => (
                    <Pressy
                      key={card.id}
                      onPress={() =>
                        router.push({ pathname: '/editor', params: { card: card.id } })
                      }
                      accessibilityLabel={t('cards.open', { name: names[card.spec.occasion] })}
                    >
                      <CardThumb
                        spec={card.spec}
                        width={card.spec.format === 'story' ? 84 : 132}
                        radius={16}
                      />
                    </Pressy>
                  ))}
                </ScrollView>
              </>
            )}

            <AppText variant="label" style={styles.section}>
              {t('home.all')}
            </AppText>
            {grid(order)}

            <Card style={styles.support}>
              <View style={styles.supportHead}>
                <Text style={styles.supportIcon} allowFontScaling={false}>
                  🪔
                </Text>
                <AppText variant="heading" style={styles.flex}>
                  {t('home.supportTitle')}
                </AppText>
              </View>
              <AppText variant="body" color={theme.muted}>
                {t('home.supportBody')}
              </AppText>
              <View style={styles.supportRow}>
                <Button
                  kind="secondary"
                  icon="heart"
                  compact
                  label={t('home.supportCta')}
                  onPress={() => router.push('/support')}
                />
                <Button
                  kind="ghost"
                  compact
                  label={t('home.howMoney')}
                  onPress={() => router.push('/money')}
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  content: { paddingHorizontal: 16, gap: 14, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { flex: 1 },
  wordmark: { fontFamily: FONTS.brand, fontSize: 34, lineHeight: 44 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 26,
    paddingLeft: 16,
    paddingRight: 6,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 16,
    paddingVertical: 12,
    outlineWidth: 0,
  },
  empty: { marginTop: 24, paddingHorizontal: 16 },
  section: { marginTop: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bleed: { marginHorizontal: -16 },
  popular: { gap: 14, paddingHorizontal: 16, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tileLabel: { marginTop: 8, paddingHorizontal: 2 },
  support: { gap: 10, marginTop: 10 },
  supportHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  supportIcon: { fontSize: 26 },
  supportRow: { gap: 4 },
  flex: { flex: 1 },
});
