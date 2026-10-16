import type { Level } from '@/domain/entities/Board';
import { parseBoard } from '@/application/levels/handmade';

/** Small boards drawn for show (home, festivals, how to play). Every one is already lit. */
export const HERO: Level = parseBoard('hero', [
  '.. .. .. /f .. .. dW',
  '.. .. .. .. .. .. ..',
  'F> .. .. *f .. .. ..',
  '.. .. .. .. .. .. ..',
  '.. .. .. \\f bf .. dB',
]);

export const SCENES = {
  mirror: parseBoard('mirror', ['.. .. .. dW', '.. .. .. ..', 'F> .. .. /f']),
  prism: parseBoard('prism', ['dW .. *f .. dW', '.. .. .. .. ..', '.. .. F^ .. ..']),
  glass: parseBoard('glass', ['F> .. rf .. dR']),
  mix: parseBoard('mix', ['F> rf dO yf F<']),
  rules: parseBoard('rules', ['F> o> .. \\f', '.. ## zz ..', 'dW .. .. /f']),
} as const;
