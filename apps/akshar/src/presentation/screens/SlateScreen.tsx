import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { Skia, useFont, type CanvasRef } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { sharer } from '@/config/container';
import { AppText, Button, IconButton } from '../components/Kit';
import { StyleSheetPicker } from '../components/Offers';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { useInk } from '../writing/useInk';
import { useWritingStyle } from '../writing/useWritingStyle';
import { WritingPad } from '../writing/WritingPad';

const MARK_FONT = require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf');

/** A blank sheet for anything: names, words, a greeting. Shareable as a picture. */
export function SlateScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { settings, seen } = useSettings();
  const { plus } = useEntitlements();
  const canvas = useRef<CanvasRef>(null);
  const markFont = useFont(MARK_FONT, 28);
  const [picker, setPicker] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  const padW = Math.min(width, 640) - 32;
  const padH = Math.max(320, height - insets.top - insets.bottom - 200);
  const { pen, surface, style } = useWritingStyle(Math.min(padW, 420));
  const ink = useInk(style);
  const left = settings.handedness === 'left';
  const showTip = !settings.tipsSeen.includes('slate');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void sharer.supported().then(setCanShare);
  }, []);

  const share = async () => {
    if (!canShare) {
      setNote(t('slate.shareUnavailable'));
      return;
    }
    const snapshot = await canvas.current?.makeImageSnapshotAsync();
    if (!snapshot) return;
    const w = snapshot.width();
    const h = snapshot.height();
    const out = Skia.Surface.Make(w, h);
    if (!out) return;
    const c = out.getCanvas();
    c.drawImage(snapshot, 0, 0);
    if (!plus && markFont) {
      const label = t('app.name');
      markFont.setSize(Math.max(18, Math.round(w * 0.04)));
      const tw = markFont.getTextWidth(label);
      const p = Skia.Paint();
      p.setColor(Skia.Color(surface.dark ? 'rgba(255, 250, 240, 0.6)' : 'rgba(36, 41, 122, 0.5)'));
      c.drawText(label, w - tw - markFont.getSize(), h - markFont.getSize() * 0.9, p, markFont);
    }
    out.flush();
    await sharer.sharePng(
      out.makeImageSnapshot().encodeToBase64(),
      `akshar-slate-${Date.now()}.png`,
      t('slate.shareTitle'),
    );
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top + 6 }]}
    >
      <View style={[styles.column, { width: padW + 32 }]}>
        <View style={styles.top}>
          <IconButton
            icon="chevron-back"
            label={t('common.back')}
            plain
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
          <AppText variant="title" style={styles.title} accessibilityRole="header">
            {t('slate.title')}
          </AppText>
          <IconButton
            icon="color-palette-outline"
            label={t('slate.style')}
            plain
            onPress={() => setPicker(true)}
          />
        </View>
        <View>
          <WritingPad
            width={padW}
            height={padH}
            ink={ink}
            surface={surface}
            pen={pen}
            ruled
            canvasRef={canvas}
            missedColour={theme.star}
            accessibilityLabel={t('slate.a11y')}
            onStrokeStart={() => {
              setNote(null);
              if (showTip) seen('slate');
            }}
          />
          {showTip && ink.empty && (
            <View pointerEvents="none" style={styles.tipWrap}>
              <AppText variant="body" center color={theme.faint} style={styles.tip}>
                {t('slate.hint')}
              </AppText>
            </View>
          )}
        </View>
        <View style={[styles.tools, left && styles.reverse, { paddingBottom: insets.bottom + 12 }]}>
          <IconButton
            icon="arrow-undo"
            label={t('trace.undo')}
            plain
            disabled={ink.empty}
            onPress={ink.undo}
          />
          <IconButton
            icon="refresh"
            label={t('trace.clear')}
            plain
            disabled={ink.empty}
            onPress={ink.clear}
          />
          <View style={styles.flex} />
          <Button
            icon="share-outline"
            label={t('slate.share')}
            disabled={ink.empty}
            accessibilityLabel={ink.empty ? t('slate.empty') : t('slate.share')}
            onPress={() => void share().catch(() => undefined)}
          />
        </View>
        {note && (
          <AppText variant="caption" center accessibilityLiveRegion="polite" style={styles.note}>
            {note}
          </AppText>
        )}
      </View>
      <StyleSheetPicker visible={picker} onClose={() => setPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  column: { flex: 1, paddingHorizontal: 16, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  tipWrap: { position: 'absolute', left: 24, right: 24, top: '42%' },
  tip: { fontSize: 18 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reverse: { flexDirection: 'row-reverse' },
  flex: { flex: 1 },
  note: { marginTop: -6 },
});
