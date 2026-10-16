import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Skia, TextAlign, useFonts, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { phraseByKey } from '@/domain/content/catalogue';
import { LANGUAGES } from '@/domain/content/languages';
import type { Phrase } from '@/domain/content/types';
import { passId } from '@/domain/entities/Bubbles';
import { sharer } from '@/config/container';
import { HindiText, NativeText } from '../components/Bits';
import { AppText, Button, IconButton, Pressy } from '../components/Kit';
import { SCRIPT_FONT_FILES } from '../fonts';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useProgress } from '../state/ProgressProvider';
import { useSettings } from '../state/SettingsProvider';
import { useVoice } from '../state/VoiceProvider';
import { FONTS, type BubbleLook } from '../theme/palette';
import { useBubbleLook, useTheme } from '../theme/ThemeProvider';

const CARD = 1080;

/** Native text big enough to read across a counter, sized by its length. */
function sizeFor(text: string): number {
  const n = [...text].length;
  if (n <= 10) return 66;
  if (n <= 20) return 52;
  if (n <= 34) return 42;
  return 34;
}

/**
 * Show to a local: one phrase, full screen, in big native script, for an
 * auto driver or a shopkeeper to read. Speaks it, keeps it, shares it.
 */
export function ShowScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const phrase = phraseByKey(decodeURIComponent(key ?? ''));
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { open, plus } = useEntitlements();
  const { progress, favourite, addToReview, inReview, practised } = useProgress();
  const voice = useVoice();
  const look = useBubbleLook(
    open({ id: passId('bubbles', settings.bubbles), premium: settings.bubbles !== 'classic' }),
  );
  const [canShare, setCanShare] = useState(false);
  // Fonts for the shareable card; sharing (and so this) is for phones only.
  const fonts = useFonts(
    phrase && Platform.OS !== 'web'
      ? {
          Script: [SCRIPT_FONT_FILES[LANGUAGES[phrase.lang].font]],
          Latin: [require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf')],
          Body: [require('@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf')],
        }
      : {},
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void sharer.supported().then(setCanShare);
  }, []);
  const { stop } = voice;
  useEffect(() => () => stop(), [stop]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  if (!phrase) {
    return (
      <View
        style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}
      >
        <IconButton icon="close" label={t('common.close')} plain onPress={close} />
      </View>
    );
  }
  const fav = progress.favourites.includes(phrase.key);
  const hear = voice.canHear(phrase);

  const share = () => {
    if (!fonts) return;
    const png = drawCard(
      phrase,
      look,
      fonts,
      plus ? null : `${t('show.mark')} · ${t('app.tagline')}`,
    );
    if (png)
      void sharer
        .sharePng(png, `speaklocal-${phrase.lineId}.png`, t('show.shareTitle'))
        .catch(() => undefined);
  };

  return (
    <View style={[styles.screen, { backgroundColor: look.bg }]}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="close" label={t('common.close')} onPress={close} />
        <View style={styles.flex} />
        <IconButton
          icon={inReview(phrase.key) ? 'bookmark' : 'bookmark-outline'}
          label={inReview(phrase.key) ? t('review.added') : t('review.add')}
          active={inReview(phrase.key)}
          onPress={() => addToReview(phrase.key)}
        />
        <IconButton
          icon={fav ? 'star' : 'star-outline'}
          label={fav ? t('phrasebook.unfavourite') : t('phrasebook.favourite')}
          active={fav}
          onPress={() => favourite(phrase.key)}
        />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <NativeText lang={phrase.lang} size={sizeFor(phrase.native)} color={look.fg} center>
          {phrase.native}
        </NativeText>
        <AppText center color={look.fg} style={styles.roman}>
          {phrase.roman}
        </AppText>
        <View style={[styles.rule, { backgroundColor: look.sub }]} />
        <AppText center color={look.sub} style={styles.meaning}>
          {phrase.en}
        </AppText>
        {settings.hindiMeanings && phrase.lang !== 'hi' && (
          <HindiText center color={look.sub} size={18}>
            {phrase.hi}
          </HindiText>
        )}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {hear && (
          <Pressy
            onPress={() => {
              voice.say(phrase);
              practised([phrase.key]);
            }}
            accessibilityLabel={t('show.hear')}
            style={[styles.hear, { backgroundColor: theme.accent }]}
          >
            <Ionicons
              name={voice.speaking === phrase.key ? 'volume-high' : 'volume-medium'}
              size={30}
              color={theme.onAccent}
            />
            <AppText variant="heading" color={theme.onAccent}>
              {t('show.hear')}
            </AppText>
          </Pressy>
        )}
        {canShare && (
          <Button
            kind="secondary"
            icon="share-outline"
            label={t('show.share')}
            disabled={!fonts}
            onPress={share}
          />
        )}
        <AppText variant="caption" center color={look.sub}>
          {canShare && !plus ? t('show.watermark') : t('show.hint')}
        </AppText>
      </View>
    </View>
  );
}

function paragraph(
  fonts: SkTypefaceFontProvider,
  text: string,
  family: string,
  size: number,
  color: string,
  width: number,
) {
  const b = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center }, fonts);
  b.pushStyle({
    color: Skia.Color(color),
    fontFamilies: [family],
    fontSize: size,
    heightMultiplier: 1.35,
  });
  b.addText(text);
  b.pop();
  const p = b.build();
  p.layout(width);
  return p;
}

/** The shareable card: the phrase in big script, its romanisation and meaning. */
function drawCard(
  phrase: Phrase,
  look: BubbleLook,
  fonts: SkTypefaceFontProvider,
  mark: string | null,
): string | null {
  const surface = Skia.Surface.MakeOffscreen(CARD, CARD) ?? Skia.Surface.Make(CARD, CARD);
  if (!surface) return null;
  const c = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(look.bg));
  c.drawRect(Skia.XYWHRect(0, 0, CARD, CARD), paint);
  // A soft speech-bubble frame.
  paint.setColor(Skia.Color(look.sub));
  paint.setAlphaf(0.14);
  c.drawRRect(Skia.RRectXY(Skia.XYWHRect(70, 90, CARD - 140, CARD - 260), 64, 64), paint);
  const tail = Skia.PathBuilder.Make();
  tail.moveTo(180, CARD - 172);
  tail.lineTo(170, CARD - 100);
  tail.lineTo(260, CARD - 172);
  tail.close();
  c.drawPath(tail.build(), paint);
  const width = CARD - 240;
  const n = [...phrase.native].length;
  const native = paragraph(
    fonts,
    phrase.native,
    'Script',
    n <= 14 ? 112 : n <= 28 ? 88 : 68,
    look.fg,
    width,
  );
  const roman = paragraph(fonts, phrase.roman, 'Latin', 46, look.fg, width);
  const meaning = paragraph(fonts, phrase.en, 'Body', 38, look.sub, width);
  const total = native.getHeight() + 24 + roman.getHeight() + 30 + meaning.getHeight();
  let y = 90 + (CARD - 260 - total) / 2;
  native.paint(c, 120, y);
  y += native.getHeight() + 24;
  roman.paint(c, 120, y);
  y += roman.getHeight() + 30;
  meaning.paint(c, 120, y);
  if (mark) {
    const m = paragraph(fonts, mark, 'Latin', 28, look.sub, CARD - 160);
    m.paint(c, 80, CARD - 80);
  }
  surface.flush();
  return surface.makeImageSnapshot().encodeToBase64();
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 10,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  roman: { fontFamily: FONTS.bodyHeavy, fontSize: 26, lineHeight: 34 },
  rule: {
    height: 2,
    width: 60,
    borderRadius: 1,
    alignSelf: 'center',
    opacity: 0.6,
    marginVertical: 8,
  },
  meaning: { fontFamily: FONTS.bodyBold, fontSize: 19, lineHeight: 26 },
  bottom: { paddingHorizontal: 20, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hear: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 64,
    borderRadius: 32,
  },
});
