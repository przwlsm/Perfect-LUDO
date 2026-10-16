import type { RefObject } from 'react';
import { Skia, useFont, type CanvasRef } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import { imageSharer } from '@/config/container';
import { useEntitlements } from '../state/EntitlementsProvider';

const WATERMARK_FONT = require('@expo-google-fonts/fredoka/600SemiBold/Fredoka_600SemiBold.ttf');

/**
 * Captures the lit board as a PNG and opens the share sheet. Without Plus
 * a small "Diya" mark sits in the corner (it is how friends find the game);
 * Plus removes it.
 */
export function useSharePicture(canvas: RefObject<CanvasRef | null>, name: string) {
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
    c.drawColor(Skia.Color('#0c1a1d'));
    c.drawImage(snapshot, 0, 0);
    if (!plus && font) {
      const label = t('app.fullName');
      font.setSize(Math.max(18, Math.round(w * 0.04)));
      const bounds = font.measureText(label);
      const pad = font.getSize() * 0.55;
      const x = w - bounds.width - pad * 3;
      const y = h - pad * 2.4;
      const pill = Skia.Paint();
      pill.setAntiAlias(true);
      pill.setColor(Skia.Color('rgba(8, 22, 26, 0.62)'));
      c.drawRRect(
        Skia.RRectXY(
          Skia.XYWHRect(
            x - pad,
            y - font.getSize() - pad * 0.3,
            bounds.width + pad * 2,
            font.getSize() + pad * 1.4,
          ),
          font.getSize(),
          font.getSize(),
        ),
        pill,
      );
      const ink = Skia.Paint();
      ink.setAntiAlias(true);
      ink.setColor(Skia.Color('#c8f09a'));
      c.drawText(label, x, y, ink, font);
    }
    surface.flush();
    const base64 = surface.makeImageSnapshot().encodeToBase64();
    await imageSharer.sharePng(base64, `monsoon-${name}-${Date.now()}.png`, t('win.shareTitle'));
  };
}
