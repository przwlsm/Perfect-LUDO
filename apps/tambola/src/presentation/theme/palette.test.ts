import { contrast } from 'app-kit';
import { DAY, NIGHT } from './palette';

describe('palettes', () => {
  for (const p of [NIGHT, DAY]) {
    describe(p.scheme, () => {
      const grounds = [p.background, p.surface, p.surfaceRaised];
      it('keeps text readable on every surface', () => {
        for (const g of grounds) {
          for (const ink of [p.text, p.muted, p.accentText, p.secondText, p.successText]) {
            expect(contrast(ink, g)).toBeGreaterThanOrEqual(4.5);
          }
        }
      });
      it('keeps button labels readable', () => {
        expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.onSecond, p.second)).toBeGreaterThanOrEqual(4.5);
      });
      it('keeps the board readable', () => {
        expect(contrast(p.boardLitText, p.boardLit)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.boardIdleText, p.boardIdle)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});
