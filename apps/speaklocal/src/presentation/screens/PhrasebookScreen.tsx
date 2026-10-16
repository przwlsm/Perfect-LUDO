import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { searchPhrases } from '@/application/phrases/phrases';
import { allPhrases } from '@/domain/content/catalogue';
import { SCENES } from '@/domain/content/scenes';
import type { Phrase, SceneId } from '@/domain/content/types';
import { HindiText, NativeText } from '../components/Bits';
import { AppText, IconButton, Pressy, Segmented } from '../components/Kit';
import { useContent } from '../state/useContent';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { FONTS } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';

type Row = { kind: 'head'; scene: SceneId } | { kind: 'phrase'; phrase: Phrase };
type Filter = 'all' | 'favourites';

/** Every open phrase, searchable in English or romanised, with favourites. */
export function PhrasebookScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lang, openScenes } = useContent();
  const { progress } = useProgress();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const openKey = openScenes.join(',');

  const { rows, hidden } = useMemo(() => {
    const scenes = openKey.split(',') as SceneId[];
    let list = allPhrases(lang, scenes);
    if (filter === 'favourites') list = list.filter((p) => progress.favourites.includes(p.key));
    const found = searchPhrases(list, query);
    const out: Row[] = [];
    if (query.trim()) {
      for (const p of found) out.push({ kind: 'phrase', phrase: p });
    } else {
      let last: SceneId | null = null;
      for (const p of found) {
        if (p.scene !== last) {
          out.push({ kind: 'head', scene: p.scene });
          last = p.scene;
        }
        out.push({ kind: 'phrase', phrase: p });
      }
    }
    const locked = SCENES.filter((s) => !scenes.includes(s.id)).map((s) => s.id);
    return { rows: out, hidden: allPhrases(lang, locked).length };
  }, [lang, openKey, filter, query, progress.favourites]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            plain
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <AppText variant="title" accessibilityRole="header" style={styles.flex}>
            {t('phrasebook.title')}
          </AppText>
        </View>
        <View
          style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons name="search" size={18} color={theme.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('phrasebook.search')}
            placeholderTextColor={theme.faint}
            accessibilityLabel={t('phrasebook.searchA11y')}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxFontSizeMultiplier={1.6}
            style={[styles.input, { color: theme.text }]}
          />
          {query.length > 0 && (
            <IconButton
              icon="close"
              label={t('common.close')}
              size={36}
              plain
              onPress={() => setQuery('')}
            />
          )}
        </View>
        <Segmented
          options={['all', 'favourites'] as const}
          value={filter}
          label={(f) => (f === 'all' ? t('phrasebook.all') : t('phrasebook.favourites'))}
          onChange={setFilter}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === 'head' ? `h-${r.scene}` : r.phrase.key)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) =>
          item.kind === 'head' ? (
            <AppText variant="label" style={styles.head}>
              {t(`scenes.${item.scene}.title`)}
            </AppText>
          ) : (
            <PhraseRow phrase={item.phrase} />
          )
        }
        ListEmptyComponent={
          <AppText center color={theme.muted} style={styles.empty}>
            {filter === 'favourites' && !query
              ? t('phrasebook.emptyFavourites')
              : t('phrasebook.emptySearch', { query })}
          </AppText>
        }
        ListFooterComponent={
          hidden > 0 && filter === 'all' ? (
            <Pressy
              onPress={() => router.push('/scenes')}
              accessibilityLabel={t('phrasebook.moreInPacks', { count: hidden })}
              style={styles.more}
            >
              <Ionicons name="sparkles-outline" size={16} color={theme.accentText} />
              <AppText variant="caption" color={theme.accentText}>
                {t('phrasebook.moreInPacks', { count: hidden })}
              </AppText>
            </Pressy>
          ) : null
        }
      />
    </View>
  );
}

function PhraseRow({ phrase }: { phrase: Phrase }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { settings } = useSettings();
  const { progress, favourite } = useProgress();
  const voice = useVoice();
  const fav = progress.favourites.includes(phrase.key);
  const speaking = voice.speaking === phrase.key;
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: speaking ? theme.highlight : theme.surface, borderColor: theme.border },
      ]}
    >
      <Pressy
        feedback={false}
        depth={0.98}
        onPress={() => router.push(`/show/${encodeURIComponent(phrase.key)}`)}
        accessibilityLabel={t('phrasebook.rowA11y', { roman: phrase.roman, meaning: phrase.en })}
        style={styles.flex}
      >
        <NativeText lang={phrase.lang} size={20}>
          {phrase.native}
        </NativeText>
        <AppText style={styles.roman}>{phrase.roman}</AppText>
        <AppText variant="caption">{phrase.en}</AppText>
        {settings.hindiMeanings && phrase.lang !== 'hi' && (
          <HindiText size={14}>{phrase.hi}</HindiText>
        )}
      </Pressy>
      <View style={styles.side}>
        {voice.canHear(phrase) && (
          <IconButton
            icon={speaking ? 'volume-high' : 'volume-medium-outline'}
            label={t('home.hear')}
            size={44}
            plain
            onPress={() => voice.say(phrase)}
          />
        )}
        <IconButton
          icon={fav ? 'star' : 'star-outline'}
          label={fav ? t('phrasebook.unfavourite') : t('phrasebook.favourite')}
          size={44}
          plain
          active={fav}
          onPress={() => favourite(phrase.key)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  top: {
    paddingHorizontal: 16,
    gap: 12,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingBottom: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 4,
    minHeight: 50,
  },
  input: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 16, paddingVertical: 10 },
  list: { paddingHorizontal: 16, gap: 8, width: '100%', maxWidth: 640, alignSelf: 'center' },
  head: { marginTop: 12, marginBottom: 2 },
  row: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 14,
    paddingVertical: 10,
    paddingRight: 6,
    alignItems: 'center',
  },
  roman: { fontFamily: FONTS.bodyHeavy, fontSize: 15, lineHeight: 20 },
  side: { gap: 4, alignItems: 'center' },
  empty: { marginTop: 40, paddingHorizontal: 20 },
  more: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 10,
  },
});
