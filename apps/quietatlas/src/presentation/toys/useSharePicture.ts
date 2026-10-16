import type { RefObject } from 'react';
import { Skia, useFont, type CanvasRef } from '@shopify/react-native-skia';
import { useTranslation } from 'react-i18next';
import type { ToyId } from '@/domain/entities/Toy';
import { sharer } from '@/config/container';
import { useEntitlements } from '../state/EntitlementsProvider';

const WATERMARK_FONT = require('@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf');

/**
 * Captures a toy's canvas as a PNG and opens the share sheet. Without Plus
 * a small "Quiet Atlas" mark sits in the corner; it is how friends find the
 * app, and Plus removes it.
 */
export function useSharePicture(canvas: RefObject<CanvasRef | null>, toy: ToyId) {
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
    c.drawImage(snapshot, 0, 0);
    if (!plus && font) {
      const label = t('app.name');
      font.setSize(Math.max(18, Math.round(w * 0.034)));
      const bounds = font.measureText(label);
      const pad = font.getSize() * 0.55;
      const x = w - bounds.width - pad * 3;
      const y = h - pad * 2.6;
      const pill = Skia.Paint();
      pill.setColor(Skia.Color('rgba(10, 10, 30, 0.42)'));
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
      ink.setColor(Skia.Color('rgba(255, 250, 240, 0.92)'));
      c.drawText(label, x, y, ink, font);
    }
    surface.flush();
    const base64 = surface.makeImageSnapshot().encodeToBase64();
    await sharer.sharePng(base64, `quiet-atlas-${toy}-${Date.now()}.png`, t('toy.shareTitle'));
  };
}
