import { contrast } from 'app-kit';
import { DUSK, MORNING } from './palette';

describe('palette', () => {
  it.each([DUSK, MORNING])('$scheme: text meets WCAG AA on every surface', (p) => {
    for (const bg of [p.background, p.surface, p.surfaceRaised]) {
      expect(contrast(p.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.muted, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accentText, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.water, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.cloud, bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps status colours readable', () => {
    for (const p of [DUSK, MORNING]) {
      expect(contrast(p.good, p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.danger, p.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
