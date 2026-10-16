import { useMemo } from 'react';
import type { PenStyle } from '@/application/pen/pen';
import { passId, penById, surfaceById } from '@/domain/entities/Cosmetics';
import { penWidthFor } from '@/domain/entities/Settings';
import { useEntitlements } from '../state/EntitlementsProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTheme } from '../theme/ThemeProvider';
import { surfaceLook } from './looks';

/**
 * The pen and paper to write with now: the learner's choice while it is
 * open to them (free, Plus, or a live day pass), else the free ones.
 */
export function useWritingStyle(box: number) {
  const { settings } = useSettings();
  const { open } = useEntitlements();
  const theme = useTheme();
  const chosenPen = penById(settings.pen);
  const pen = open({ id: passId('pen', chosenPen.id), premium: chosenPen.premium })
    ? chosenPen
    : penById('ink');
  const chosenSurface = surfaceById(settings.surface);
  const surfaceId = open({
    id: passId('surface', chosenSurface.id),
    premium: chosenSurface.premium,
  })
    ? chosenSurface.id
    : 'desk';
  const surface = surfaceLook(surfaceId, theme.scheme === 'slate');
  const style = useMemo<PenStyle>(
    () => ({ width: penWidthFor(settings.penSize, box) * pen.widthFactor, nib: pen.nib }),
    [settings.penSize, box, pen.widthFactor, pen.nib],
  );
  return { pen: pen.id, surface, style };
}
