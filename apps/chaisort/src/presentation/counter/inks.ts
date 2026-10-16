import { isLight } from 'app-kit';
import { INGREDIENTS } from '@/domain/entities/Ingredient';
import type { Ink } from './paint';

/** Every ingredient as the painter sees it, with a mark colour that reads on its liquid. */
export const INKS: readonly Ink[] = INGREDIENTS.map((i) => ({
  colour: i.colour,
  light: i.light,
  mark: i.mark,
  spice: i.spice,
  markColour: isLight(i.colour) ? 'rgba(60, 28, 8, 0.62)' : 'rgba(255, 248, 236, 0.78)',
}));
