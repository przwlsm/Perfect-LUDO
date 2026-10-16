import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import { PaintStyle, Skia, useFont, type SkFont } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import type { Script } from '@/domain/entities/Script';
import { lettersOf } from '@/domain/entities/Script';
import { sharer } from '@/config/container';
import { boxGlyph } from '../glyph/useGlyph';
import { useOutlineSource, type OutlineOf } from '../glyph/useOutlineSource';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { AppText, Button, Sheet } from './Kit';

const LABEL_FONT = require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf');
const W = 1240;
const H = 1754;

interface SheetText {
  readonly title: string;
  readonly subtitle: string;
  readonly mark: string;
}

/**
 * Draws a printable A4 page: every letter of a script as a faint, dotted
 * shape to trace with a real pen, its romanisation underneath. Without
 * Plus a small Akshar mark sits at the foot of the page.
 */
function drawSheet(
  script: Script,
  outline: OutlineOf,
  font: SkFont,
  text: SheetText,
  watermark: boolean,
): string | null {
  const surface = Skia.Surface.MakeOffscreen(W, H) ?? Skia.Surface.Make(W, H);
  if (!surface) return null;
  const c = surface.getCanvas();
  const paint = (color: string, stroke?: number) => {
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(Skia.Color(color));
    if (stroke !== undefined) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(stroke);
    }
    return p;
  };
  c.drawRect(Skia.XYWHRect(0, 0, W, H), paint('#fffdf8'));

  const margin = 80;
  font.setSize(46);
  c.drawText(text.title, margin, margin + 40, paint('#24297a'), font);
  font.setSize(24);
  c.drawText(text.subtitle, margin, margin + 84, paint('#6b6880'), font);

  const letters = lettersOf(script);
  const cols = 7;
  const top = margin + 130;
  const cellW = (W - margin * 2) / cols;
  const cellH = Math.min(cellW + 34, (H - top - margin - 30) / Math.ceil(letters.length / cols));
  const glyphBox = Math.min(cellW, cellH - 34) - 8;
  const border = paint('rgba(66, 98, 170, 0.28)', 1.5);
  const guide = paint('rgba(36, 41, 122, 0.10)');
  const edge = paint('rgba(36, 41, 122, 0.30)', 1.4);
  const dot = paint('rgba(36, 41, 122, 0.55)');
  const label = paint('#4b4870');
  font.setSize(22);
  letters.forEach((l, i) => {
    const col = script.rtl ? cols - 1 - (i % cols) : i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * cellW;
    const y = top + row * cellH;
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 4, y + 4, cellW - 8, cellH - 8), 18, 18), border);
    const g = boxGlyph(l.char, outline(l.char), glyphBox, 0.7, glyphBox / 34);
    if (g) {
      c.save();
      c.translate(x + (cellW - glyphBox) / 2, y + 6);
      c.drawPath(g.path, guide);
      c.drawPath(g.path, edge);
      for (const d of g.shape.dots) c.drawCircle(d.x, d.y, 2.8, dot);
      c.restore();
    }
    const w = font.getTextWidth(l.translit);
    c.drawText(l.translit, x + (cellW - w) / 2, y + cellH - 18, label, font);
  });

  if (watermark) {
    font.setSize(26);
    const w = font.getTextWidth(text.mark);
    c.drawText(text.mark, W - margin - w, H - 40, paint('rgba(36, 41, 122, 0.55)'), font);
  }
  surface.flush();
  return surface.makeImageSnapshot().encodeToBase64();
}

export function PracticeSheet({
  script,
  visible,
  onClose,
}: {
  script: Script;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { plus } = useEntitlements();
  const outline = useOutlineSource(script.font);
  const font = useFont(LABEL_FONT, 24);
  const [png, setPng] = useState<{ key: string; data: string } | null>(null);
  const [canShare, setCanShare] = useState(false);
  const key = `${script.id}:${plus}`;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void sharer.supported().then(setCanShare);
  }, []);

  useEffect(() => {
    if (!visible || !outline || !font || png?.key === key) return;
    // Let the sheet open first; drawing a page takes a moment.
    const timer = setTimeout(() => {
      const data = drawSheet(
        script,
        outline,
        font,
        {
          title: `${t(`scripts.${script.id}.name`)} · ${t('script.sheetTitle')}`,
          subtitle: t(`scripts.${script.id}.languages`),
          mark: `${t('app.name')} · ${t('app.tagline')}`,
        },
        !plus,
      );
      if (data) setPng({ key, data });
    }, 120);
    return () => clearTimeout(timer);
  }, [visible, outline, font, png, key, script, plus, t]);

  const ready = png?.key === key ? png.data : null;
  return (
    <Sheet visible={visible} onClose={onClose} title={t('script.sheetTitle')}>
      <AppText color={theme.muted}>
        {t('script.sheetBody', { script: t(`scripts.${script.id}.name`) })}
      </AppText>
      <View
        style={[
          styles.preview,
          { borderColor: theme.border, backgroundColor: theme.surfaceRaised },
        ]}
      >
        {ready ? (
          <Image
            source={{ uri: `data:image/png;base64,${ready}` }}
            style={styles.image}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <ActivityIndicator color={theme.accentText} />
        )}
      </View>
      {!plus && (
        <AppText variant="caption" center>
          {t('script.sheetWatermark')}
        </AppText>
      )}
      {canShare ? (
        <Button
          icon="share-outline"
          label={t('script.sheetShare')}
          disabled={!ready}
          onPress={() => {
            if (ready)
              void sharer
                .sharePng(ready, `akshar-${script.id}-sheet.png`, t('script.sheetTitle'))
                .catch(() => undefined);
          }}
        />
      ) : (
        <AppText variant="caption" center>
          {t('script.sheetUnavailable')}
        </AppText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    aspectRatio: W / H,
    maxHeight: 420,
    alignSelf: 'center',
    width: '78%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
});
