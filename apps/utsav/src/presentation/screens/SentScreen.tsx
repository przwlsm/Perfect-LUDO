import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Canvas } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useFrameCallback,
  useSharedValue,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { templateById } from '@/application/catalogue/templates';
import { signOff } from '@/application/messages';
import { cardAsText } from '@/domain/entities/Card';
import { clipboard, reviews } from '@/config/container';
import { CardThumb } from '../cards/CardThumb';
import { FxLayer } from '../cards/Fx';
import { paletteOf } from '../cards/paint/card';
import { useShareCard } from '../cards/useShareCard';
import { AppText, Button } from '../components/Kit';
import { Page } from '../components/Page';
import { useCards } from '../state/CardsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';

/** The moment after sharing: the card, a shower of petals, and what to do next. */
export function SentScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { card: id } = useLocalSearchParams<{ card: string }>();
  const { byId } = useCards();
  const { settings, update, haptics, sounds, calmMotion } = useSettings();
  const share = useShareCard();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const card = id ? byId(id) : undefined;
  const template = card ? templateById(card.spec.templateId) : undefined;

  const clock = useSharedValue(0);
  useFrameCallback((f) => {
    if (!calmMotion) clock.set(f.timeSinceFirstFrame / 1000);
  });

  useEffect(() => {
    sounds.play('chime');
    // The store's own review card, offered once, after a few happy shares.
    if (settings.shares >= 2 && !settings.reviewAsked) {
      update({ reviewAsked: true });
      const timer = setTimeout(() => void reviews.request(), 2400);
      return () => clearTimeout(timer);
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!card || !template) {
    return (
      <Page title={t('sent.title')}>
        <AppText variant="body">{t('sent.notFound')}</AppText>
      </Page>
    );
  }
  const contentWidth = Math.min(width, 640);
  const story = card.spec.format === 'story';
  const cardWidth = story
    ? Math.min(contentWidth * 0.5, (height * 0.42 * 1080) / 1920)
    : Math.min(contentWidth - 96, height * 0.4);
  const palette = paletteOf({ spec: card.spec, template });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[...theme.glow]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {!calmMotion && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <FxLayer
            kind="petals"
            anchors={[]}
            W={width}
            H={height}
            palette={palette}
            clock={clock}
          />
        </Canvas>
      )}
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20, width: contentWidth },
        ]}
      >
        <Animated.View
          entering={calmMotion ? undefined : ZoomIn.springify().damping(14)}
          style={styles.cardWrap}
        >
          <CardThumb spec={card.spec} width={cardWidth} radius={22} urgent />
        </Animated.View>
        <Animated.View entering={calmMotion ? undefined : FadeIn.delay(250)} style={styles.words}>
          <AppText variant="display" center accessibilityRole="header">
            {t('sent.title')}
          </AppText>
          <AppText variant="body" center color={theme.muted}>
            {t('sent.body')}
          </AppText>
        </Animated.View>
        <View style={styles.actions}>
          <Button
            icon="copy-outline"
            kind="secondary"
            label={t('sent.copy')}
            onPress={() => {
              const text = cardAsText(card.spec, signOff(card.spec.language, card.spec.from));
              void clipboard.copy(text).then((ok) => {
                if (ok) {
                  haptics.tap();
                  setNote(t('sent.copied'));
                }
              });
            }}
          />
          <Button
            icon="share-social"
            label={t('sent.again')}
            busy={busy}
            onPress={() => {
              setBusy(true);
              void share(card.spec, template)
                .catch(() => undefined)
                .finally(() => setBusy(false));
            }}
          />
          <Button
            icon="sparkles-outline"
            kind="secondary"
            label={t('sent.another')}
            onPress={() =>
              router.replace({ pathname: '/occasion/[id]', params: { id: card.spec.occasion } })
            }
          />
          <Button kind="ghost" label={t('sent.home')} onPress={() => router.dismissTo('/')} />
          {note && (
            <AppText
              variant="caption"
              center
              color={theme.success}
              accessibilityLiveRegion="polite"
            >
              {note}
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24, gap: 20, justifyContent: 'center' },
  cardWrap: { alignItems: 'center' },
  words: { gap: 8 },
  actions: { gap: 10 },
});
