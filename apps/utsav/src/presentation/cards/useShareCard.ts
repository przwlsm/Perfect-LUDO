import { useTranslation } from 'react-i18next';
import { exportPlan } from '@/application/card';
import type { CardSpec } from '@/domain/entities/Card';
import type { Template } from '@/domain/entities/Template';
import { sharer } from '@/config/container';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useCardFonts } from './fonts';
import { loadPhoto } from './photo';
import { renderCard, toBase64 } from './render';

/**
 * Draws the finished card at export size (square for everyone; HD and
 * Status with Plus) and opens the system share sheet: WhatsApp, Instagram,
 * save to photos, anything the phone offers. Free cards carry the small
 * "Utsav" mark.
 */
export function useShareCard() {
  const fonts = useCardFonts();
  const { plus } = useEntitlements();
  const { sounds, haptics } = useSettings();
  const { t } = useTranslation();

  return async (spec: CardSpec, template: Template): Promise<void> => {
    if (!fonts) throw new Error('Fonts are still loading');
    const plan = exportPlan(spec.format, plus);
    const exported: CardSpec = { ...spec, format: plan.format };
    const photo = spec.photo ? await loadPhoto(spec.photo.uri) : null;
    // Let the button show its spinner before the heavy drawing starts.
    await new Promise((resolve) => setTimeout(resolve, 30));
    const image = renderCard(
      { spec: exported, template, plus, fonts, photo },
      plan.width,
      plan.watermark ? t('app.name') : null,
    );
    if (!image) throw new Error('Could not draw the card');
    const base64 = toBase64(image, 'png');
    sounds.play('whoosh');
    haptics.delight();
    await sharer.sharePng(
      base64,
      `utsav-${spec.occasion}-${Date.now()}.png`,
      t('editor.shareTitle'),
    );
  };
}
