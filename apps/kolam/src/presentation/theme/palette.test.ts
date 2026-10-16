import { contrast } from 'app-kit';
import { COURTYARD, DAWN } from './palette';

describe('palettes', () => {
  for (const p of [DAWN, COURTYARD]) {
    describe(p.scheme, () => {
      it('keeps text readable on every surface', () => {
        for (const ground of [p.background, p.surface, p.surfaceRaised]) {
          for (const ink of [p.text, p.muted, p.accentText, p.secondText, p.successText]) {
            expect(contrast(ink, ground)).toBeGreaterThanOrEqual(4.5);
          }
          expect(contrast(p.danger, ground)).toBeGreaterThanOrEqual(4.5);
        }
      });
      it('keeps button labels readable', () => {
        expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.onSecond, p.second)).toBeGreaterThanOrEqual(4.5);
      });
      it('keeps the numbers on the board readable', () => {
        for (const ground of p.floor) {
          expect(contrast(p.clue, ground)).toBeGreaterThanOrEqual(4.5);
          // Error numbers are large and bold on the board.
          expect(contrast(p.clueError, ground)).toBeGreaterThanOrEqual(3);
        }
      });
    });
  }
});
