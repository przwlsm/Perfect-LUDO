import { contrast } from 'app-kit';
import { PAPER, SLATE } from './palette';
import { PEN_LOOKS, SURFACE_LOOKS } from '../writing/looks';

describe.each([PAPER, SLATE])('$scheme palette', (p) => {
  it.each(['text', 'muted', 'accentText'] as const)(
    '%s meets AA on background and surface',
    (k) => {
      expect(contrast(p[k], p.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p[k], p.surface)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('button text reads on the accent', () => {
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('success and danger notes are readable', () => {
    expect(contrast(p.success, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.danger, p.background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('writing looks', () => {
  it('every pen shows clearly on every surface', () => {
    for (const s of Object.values(SURFACE_LOOKS)) {
      for (const look of [s.light, s.dark]) {
        for (const pen of Object.values(PEN_LOOKS)) {
          const ink = look.dark ? pen.onDark : pen.onLight;
          expect(contrast(ink, look.paper[0])).toBeGreaterThanOrEqual(2.6);
        }
      }
    }
  });
});
