import { contrast } from 'app-kit';
import { IVORY, NIGHT } from './palette';

describe.each([NIGHT, IVORY])('$scheme palette', (p) => {
  it.each(['background', 'surface', 'surfaceRaised'] as const)('text reads on %s', (bg) => {
    for (const fg of [p.text, p.muted, p.accentText, p.magentaText, p.success, p.danger]) {
      expect(contrast(fg, p[bg])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('button labels read on the accent', () => {
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('faint text is still legible for large captions', () => {
    expect(contrast(p.faint, p.background)).toBeGreaterThanOrEqual(3);
  });
});
