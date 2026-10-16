import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { newCard, withTemplate } from '@/application/card';
import { heroTemplate, templateById, templatesFor } from '@/application/catalogue/templates';
import { fitPreview } from '@/application/layout';
import type { CardSpec, PhotoSpec } from '@/domain/entities/Card';
import { isOccasionId } from '@/domain/entities/Occasion';
import type { Template } from '@/domain/entities/Template';
import { photos } from '@/config/container';
import { CardThumb } from '../cards/CardThumb';
import { useCardFonts } from '../cards/fonts';
import { LivePreview } from '../cards/LivePreview';
import { useShareCard } from '../cards/useShareCard';
import { AppText, Button, IconButton } from '../components/Kit';
import { goBack, Page } from '../components/Page';
import { useCards } from '../state/CardsProvider';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { PhotoPanel, StylePanel, WordsPanel } from './editor/EditorPanels';
import { PlusOnlySheet, UnlockSheet } from './editor/EditorSheets';

type Tab = 'words' | 'photo' | 'style';
const TABS: { key: Tab; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'words', icon: 'chatbubble-ellipses-outline' },
  { key: 'photo', icon: 'person-circle-outline' },
  { key: 'style', icon: 'color-palette-outline' },
];

/** Resolves where the editor starts: a saved card, a template, or an occasion's first design. */
function useInitial(): { spec: CardSpec; cardId: string | null } | null {
  const params = useLocalSearchParams<{
    template?: string;
    card?: string;
    occasion?: string;
    seed?: string;
  }>();
  const { byId } = useCards();
  const { settings, cardLanguage } = useSettings();
  const [initial] = useState(() => {
    if (params.card) {
      const saved = byId(params.card);
      return saved ? { spec: saved.spec, cardId: saved.id } : null;
    }
    const seed = Number(params.seed ?? 0) || 0;
    const template = params.template
      ? templateById(params.template)
      : isOccasionId(params.occasion)
        ? heroTemplate(params.occasion)
        : undefined;
    return template
      ? { spec: newCard(template, cardLanguage, settings.name, seed), cardId: null }
      : null;
  });
  return initial;
}

export function EditorScreen() {
  const { t } = useTranslation();
  const initial = useInitial();
  if (!initial) {
    return (
      <Page title={t('app.full')}>
        <AppText variant="body">{t('editor.notFound')}</AppText>
      </Page>
    );
  }
  return <Editor initial={initial.spec} initialId={initial.cardId} />;
}

function Editor({ initial, initialId }: { initial: CardSpec; initialId: string | null }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const fonts = useCardFonts();
  const { settings, update, haptics, sounds, calmMotion } = useSettings();
  const { plus, isOpen, passLeft } = useEntitlements();
  const cards = useCards();
  const share = useShareCard();

  const [spec, setSpec] = useState(initial);
  const [cardId, setCardId] = useState(initialId);
  const [tab, setTab] = useState<Tab>('words');
  const [busy, setBusy] = useState<'share' | 'photo' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [unlock, setUnlock] = useState(false);
  const [plusOnly, setPlusOnly] = useState(false);

  const templates = useMemo(() => templatesFor(spec.occasion), [spec.occasion]);
  const index = Math.max(
    0,
    templates.findIndex((tpl) => tpl.id === spec.templateId),
  );
  const template: Template = templates[index] ?? templateById(spec.templateId)!;
  const open = isOpen(template);
  const pass = template.premium && !plus && passLeft(template) > 0;

  const pageW = Math.min(width, 640);
  const preview = fitPreview(
    spec.format,
    pageW - 40,
    Math.min(height * 0.5, spec.format === 'story' ? 520 : 440),
  );
  const photoEditing = tab === 'photo' && spec.photo !== null;

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 2600);
    return () => clearTimeout(timer);
  }, [note]);

  useEffect(
    () => () => {
      if (!settings.editorHintSeen) update({ editorHintSeen: true });
    },
    // Only on leaving the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // The pager: swipe the card to try the occasion's other designs.
  const list = useRef<FlatList<Template>>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goTo = useCallback(
    (i: number, scroll = true) => {
      const next = templates[(i + templates.length) % templates.length];
      if (!next || next.id === spec.templateId) return;
      setSpec((s) => withTemplate(s, next));
      haptics.tick();
      sounds.play('sparkle');
      if (scroll)
        list.current?.scrollToIndex({ index: templates.indexOf(next), animated: !calmMotion });
    },
    [templates, spec.templateId, haptics, sounds, calmMotion],
  );
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const i = Math.round(x / pageW);
      if (i !== index) goTo(i, false);
    }, 140);
  };

  const onPhotoMove = useCallback(
    (moved: Pick<PhotoSpec, 'zoom' | 'x' | 'y'>) =>
      setSpec((s) => (s.photo ? { ...s, photo: { ...s.photo, ...moved } } : s)),
    [],
  );

  const pickPhoto = async () => {
    setBusy('photo');
    try {
      const picked = await photos.pick();
      if (picked) {
        setSpec((s) => ({
          ...s,
          photo: { uri: picked.uri, shape: s.photo?.shape ?? 'circle', zoom: 1, x: 0, y: 0 },
        }));
        sounds.play('sparkle');
      }
    } finally {
      setBusy(null);
    }
  };

  const doShare = async () => {
    if (!open) {
      setUnlock(true);
      return;
    }
    setBusy('share');
    try {
      await share(spec, template);
      const id = cards.save(spec, cardId ?? undefined, true);
      setCardId(id);
      update({
        shares: settings.shares + 1,
        ...(spec.from.trim() ? { name: spec.from.trim() } : {}),
      });
      router.push({ pathname: '/sent', params: { card: id } });
    } catch {
      setNote(t('editor.shareFailed'));
    } finally {
      setBusy(null);
    }
  };

  const doSave = () => {
    const id = cards.save(spec, cardId ?? undefined);
    setCardId(id);
    haptics.delight();
    sounds.play('chime');
    setNote(t('editor.saved'));
  };

  const firstFree = () => {
    setUnlock(false);
    const free = templates.findIndex((tpl) => !tpl.premium);
    if (free >= 0) goTo(free);
  };

  const hours = Math.max(1, Math.ceil(passLeft(template) / 3_600_000));

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 6, width: pageW }]}>
        <IconButton icon="chevron-back" label={t('common.back')} glass={false} onPress={goBack} />
        <AppText variant="heading" style={styles.flex} numberOfLines={1} accessibilityRole="header">
          {t(`occasions.${spec.occasion}.name`)}
        </AppText>
        <IconButton
          icon="bookmark-outline"
          label={t('editor.save')}
          glass={false}
          onPress={doSave}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { width: pageW, paddingBottom: 110 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!photoEditing}
        automaticallyAdjustKeyboardInsets
      >
        <FlatList
          ref={list}
          data={templates as Template[]}
          keyExtractor={(tpl) => tpl.id}
          horizontal
          pagingEnabled
          scrollEnabled={!photoEditing}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={32}
          style={{ width: pageW }}
          extraData={spec}
          renderItem={({ item, index: i }) => (
            <View style={[styles.page, { width: pageW, height: preview.h + 12 }]}>
              {i === index && fonts ? (
                <View style={[styles.previewShadow, { boxShadow: `0 16px 40px ${theme.shadow}` }]}>
                  <LivePreview
                    spec={spec}
                    template={item}
                    plus={plus}
                    width={preview.w}
                    height={preview.h}
                    animate={!calmMotion}
                    onPhotoMove={photoEditing ? onPhotoMove : undefined}
                  />
                </View>
              ) : Math.abs(i - index) <= 1 ? (
                <CardThumb spec={withTemplate(spec, item)} width={preview.w} radius={4} />
              ) : (
                <View
                  style={{ width: preview.w, height: preview.h, backgroundColor: theme.shimmer }}
                />
              )}
            </View>
          )}
        />

        <View style={styles.designRow}>
          <IconButton
            icon="chevron-back"
            label={t('editor.prev')}
            size={44}
            glass={false}
            onPress={() => goTo(index - 1)}
          />
          <View
            style={styles.designInfo}
            accessible
            accessibilityLabel={t('editor.design', {
              index: index + 1,
              total: templates.length,
              name: t(`designs.${template.design}`),
            })}
          >
            <AppText variant="heading" center numberOfLines={1}>
              {t(`designs.${template.design}`)}
            </AppText>
            <View style={styles.dots}>
              {templates.map((tpl, i) => (
                <View
                  key={tpl.id}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === index ? theme.accent : theme.faint,
                      width: i === index ? 18 : 7,
                    },
                  ]}
                />
              ))}
            </View>
            {template.premium && !plus && (
              <View style={styles.badgeRow}>
                <Ionicons
                  name={pass ? 'time-outline' : 'sparkles'}
                  size={13}
                  color={theme.accentText}
                />
                <AppText variant="caption" color={theme.accentText}>
                  {pass ? t('editor.pass', { hours }) : t('editor.locked')}
                </AppText>
              </View>
            )}
          </View>
          <IconButton
            icon="chevron-forward"
            label={t('editor.next')}
            size={44}
            glass={false}
            onPress={() => goTo(index + 1)}
          />
        </View>

        {!settings.editorHintSeen && (
          <AppText variant="caption" center color={theme.muted}>
            {t('editor.hint')}
          </AppText>
        )}
        {!fonts && (
          <AppText variant="caption" center>
            {t('editor.loading')}
          </AppText>
        )}

        <View
          style={[styles.tabs, { backgroundColor: theme.surfaceRaised }]}
          accessibilityRole="tablist"
        >
          {TABS.map(({ key, icon }) => {
            const on = tab === key;
            return (
              <View key={key} style={styles.flex}>
                <Button
                  kind={on ? 'primary' : 'ghost'}
                  compact
                  icon={icon}
                  label={t(
                    `editor.tab${key[0]!.toUpperCase()}${key.slice(1)}` as 'editor.tabWords',
                  )}
                  onPress={() => setTab(key)}
                  accessibilityLabel={t(
                    `editor.tab${key[0]!.toUpperCase()}${key.slice(1)}` as 'editor.tabWords',
                  )}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.panel}>
          {tab === 'words' && <WordsPanel spec={spec} onChange={setSpec} />}
          {tab === 'photo' && (
            <PhotoPanel
              spec={spec}
              onChange={setSpec}
              onPick={() => void pickPhoto()}
              busy={busy === 'photo'}
            />
          )}
          {tab === 'style' && (
            <StylePanel
              spec={spec}
              template={template}
              plus={plus}
              onChange={setSpec}
              onPlusOnly={() => setPlusOnly(true)}
            />
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.bar,
            borderColor: theme.glassBorder,
          },
        ]}
      >
        {note && (
          <AppText
            variant="caption"
            center
            color={theme.text}
            accessibilityLiveRegion="polite"
            style={styles.note}
          >
            {note}
          </AppText>
        )}
        <View style={[styles.bottomRow, { width: pageW - 32 }]}>
          <Button
            icon={open ? 'share-social' : 'lock-open'}
            label={
              busy === 'share' ? t('editor.sharing') : open ? t('editor.share') : t('editor.unlock')
            }
            accessibilityLabel={open ? t('editor.shareA11y') : t('editor.unlock')}
            busy={busy === 'share'}
            disabled={!fonts}
            onPress={() => void doShare()}
            style={styles.flex}
          />
        </View>
      </View>

      <UnlockSheet
        template={template}
        visible={unlock}
        onClose={() => setUnlock(false)}
        onChooseFree={firstFree}
      />
      <PlusOnlySheet visible={plusOnly} onClose={() => setPlusOnly(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  content: { gap: 14, alignSelf: 'center' },
  page: { alignItems: 'center', justifyContent: 'center' },
  previewShadow: { borderRadius: 4 },
  designRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  designInfo: { flex: 1, alignItems: 'center', gap: 6 },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { height: 7, borderRadius: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 26, marginHorizontal: 16 },
  panel: { paddingHorizontal: 16 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  bottomRow: { flexDirection: 'row', gap: 10 },
  note: { paddingHorizontal: 16 },
  flex: { flex: 1 },
});
