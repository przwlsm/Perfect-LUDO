import { decodePuzzle, type Level } from '@/domain/entities/Board';

/**
 * The How to play board: three by three, with a 0, a 3 in the corner and a
 * 1, so the first ideas show up on their own. It has exactly one answer
 * (see levels.test.ts).
 */
export const TUTORIAL: Level = { id: 'tutorial', ...decodePuzzle('3;3;1;3201222..') };

/**
 * The board drawn on the home screen and the theme previews: a six by six
 * kolam whose loop winds through the whole board.
 */
export const SHOWCASE: Level = {
  id: 'showcase',
  ...decodePuzzle('6;6;2;.3.....1.3.3..3.3.3.2...323.1...1.11'),
};
