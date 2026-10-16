import { memo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { sizeLabel } from '@/domain/entities/Board';
import { CHAPTER_COUNT, CHAPTER_SIZE, chapterLevels, levelFor } from '@/application/levels/levels';
import { CHAPTER_KEYS } from '../components/chapters';
import { AppText, Card, IconButton } from '../components/Kit';
import { useRecord } from '../state/RecordProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

const CHAPTERS = Array.from({ length: CHAPTER_COUNT }, (_, i) => i);
const GAP = 8;

/** Fifteen chapters of twenty. Levels open a few ahead of the furthest solved, so nobody is stuck. */
export function LevelsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const rec = useRecord();
  const scroll = useRef<ScrollView>(null);
  const scrolled = useRef(false);
  const solved = Object.keys(rec.record.progress.stars).map(Number);
  const next = (solved.length ? Math.max(...solved) : 0) + 1;
  const current = Math.min(CHAPTER_COUNT - 1, Math.floor((next - 1) / CHAPTER_SIZE));
  const inner = Math.min(width, 640) - 32 - 36;
  const size = Math.floor((inner - GAP * 4) / 5);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headRow}>
            <IconButton
              icon="chevron-back"
              label={t('common.back')}
              glass={false}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
            <AppText variant="title" accessibilityRole="header" style={styles.flex}>
              {t('levels.title')}
            </AppText>
            <View
              style={[
                styles.total,
                { backgroundColor: theme.surfaceRaised, borderColor: theme.border },
              ]}
            >
              <Ionicons name="star" size={16} color={theme.accent} />
              <AppText variant="heading">{rec.totalStars}</AppText>
            </View>
          </View>
          <AppText variant="caption">{t('levels.openAhead')}</AppText>
        </View>
        {CHAPTERS.map((c) => (
          <View
            key={c}
            onLayout={
              c === current && c > 0
                ? (e) => {
                    if (scrolled.current) return;
                    scrolled.current = true;
                    scroll.current?.scrollTo({ y: e.nativeEvent.layout.y - 12, animated: false });
                  }
                : undefined
            }
          >
            <Chapter chapter={c} next={next} size={size} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** "5×5" or "5×5 – 6×6" for the boards in a chapter. */
function sizes(levels: readonly number[]): string {
  const first = sizeLabel(levelFor(levels[0]!).puzzle);
  const last = sizeLabel(levelFor(levels[levels.length - 1]!).puzzle);
  return first === last ? first : `${first} – ${last}`;
}

const Chapter = memo(function Chapter({
  chapter,
  next,
  size,
}: {
  chapter: number;
  next: number;
  size: number;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const rec = useRecord();
  const { haptics, sounds } = useSettings();
  const levels = chapterLevels(chapter);
  const got = levels.reduce((s, n) => s + rec.starsOf(n), 0);
  return (
    <Card style={styles.chapter}>
      <View style={styles.chapterHead}>
        <View style={styles.flex}>
          <AppText variant="label" color={theme.accentText}>
            {t('levels.chapter', { n: chapter + 1 })}
          </AppText>
          <AppText variant="title">{t(CHAPTER_KEYS[chapter]!)}</AppText>
          <AppText variant="caption">{t('levels.size', { size: sizes(levels) })}</AppText>
        </View>
        <View style={styles.chapterStars}>
          <Ionicons name="star" size={14} color={theme.accent} />
          <AppText variant="heading" color={theme.muted}>
            {t('levels.stars', { got, total: levels.length * 3 })}
          </AppText>
        </View>
      </View>
      <View style={styles.grid}>
        {levels.map((n) => {
          const stars = rec.starsOf(n);
          const open = rec.isOpen(n);
          const isNext = n === next;
          return (
            <Pressable
              key={n}
              disabled={!open}
              onPress={() => {
                haptics.tap();
                sounds.play('tap');
                router.push({ pathname: '/play/[id]', params: { id: String(n) } });
              }}
              accessibilityRole="button"
              accessibilityLabel={
                !open
                  ? t('levels.lockedA11y', { n })
                  : stars
                    ? t('levels.levelA11y', { n, count: stars })
                    : t('levels.newA11y', { n })
              }
              accessibilityState={{ disabled: !open }}
              style={({ pressed }) => [
                styles.level,
                {
                  width: size,
                  height: size,
                  backgroundColor: isNext
                    ? theme.accent
                    : stars
                      ? theme.surfaceRaised
                      : 'transparent',
                  borderColor: isNext ? 'transparent' : theme.border,
                  opacity: open ? 1 : 0.5,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  boxShadow: isNext ? `0 0 18px ${theme.accent}` : undefined,
                },
              ]}
            >
              {open ? (
                <AppText variant="heading" color={isNext ? theme.onAccent : theme.text}>
                  {n}
                </AppText>
              ) : (
                <Ionicons name="lock-closed" size={15} color={theme.muted} />
              )}
              {open && (
                <View style={styles.levelStars}>
                  {[0, 1, 2].map((i) => (
                    <Ionicons
                      key={i}
                      name={i < stars ? 'star' : 'star-outline'}
                      size={10}
                      color={isNext ? theme.onAccent : i < stars ? theme.accent : theme.faint}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: 6, marginBottom: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  chapter: { gap: 14 },
  chapterHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  chapterStars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  level: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  levelStars: { flexDirection: 'row', gap: 1 },
});
