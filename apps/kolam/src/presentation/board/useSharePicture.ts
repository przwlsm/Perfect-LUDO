import type { RefObject } from 'react';
import { Skia, useFont, type CanvasRef } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import { imageSharer } from '@/config/container';
import { useEntitlements } from '../state/EntitlementsProvider';

const WATERMARK_FONT = require('@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf');

/**
 * Captures the finished kolam as a PNG and opens the share sheet. Without
 * Plus a small "Kolam" mark sits in the corner (it is how friends find the
 * game); Plus removes it.
 */
export function useSharePicture(
  canvas: RefObject<CanvasRef | null>,
  name: string,
  ground: string,
  ink: string,
) {
  const font = useFont(WATERMARK_FONT, 32);
  const { plus } = useEntitlements();
  const { t } = useTranslation();

  return async (): Promise<void> => {
    const snapshot = await canvas.current?.makeImageSnapshotAsync();
    if (!snapshot) throw new Error('Nothing to share yet');
    const w = snapshot.width();
    const h = snapshot.height();
    const surface = Skia.Surface.Make(w, h);
    if (!surface) throw new Error('No surface');
    const c = surface.getCanvas();
    c.drawColor(Skia.Color(ground));
    c.drawImage(snapshot, 0, 0);
    if (!plus && font) {
      const label = t('app.name');
      font.setSize(Math.max(18, Math.round(w * 0.04)));
      const width = font.getTextWidth(label);
      const pad = font.getSize() * 0.55;
      const x = w - width - pad * 2;
      const y = h - pad * 1.6;
      const mark = Skia.Paint();
      mark.setAntiAlias(true);
      mark.setColor(Skia.Color(ink));
      mark.setAlphaf(0.75);
      c.drawText(label, x, y, mark, font);
    }
    surface.flush();
    const base64 = surface.makeImageSnapshot().encodeToBase64();
    await imageSharer.sharePng(base64, `kolam-${name}-${Date.now()}.png`, t('win.shareTitle'));
  };
}
