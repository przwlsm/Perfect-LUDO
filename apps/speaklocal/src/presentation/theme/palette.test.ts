import { contrast } from 'app-kit';
import { BUBBLE_IDS } from '@/domain/entities/Bubbles';
import { BUBBLE_LOOKS, DAY, DUSK } from './palette';

describe.each([DAY, DUSK])('$scheme palette', (p) => {
  it.each(['text', 'muted', 'accentText'] as const)(
    '%s meets AA on background, surface and raised surface',
    (k) => {
      expect(contrast(p[k], p.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p[k], p.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p[k], p.surfaceRaised)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('button text reads on yellow and on teal', () => {
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.onTeal, p.teal)).toBeGreaterThanOrEqual(4.5);
  });

  it('text reads on the spoken-line highlight', () => {
    expect(contrast(p.text, p.highlight)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.highlight)).toBeGreaterThanOrEqual(4.5);
  });

  it('success and danger notes are readable', () => {
    expect(contrast(p.success, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.danger, p.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.success, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.danger, p.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('chat colours', () => {
  it.each(BUBBLE_IDS.map((id) => [id] as const))('%s bubbles are readable in both lights', (id) => {
    for (const look of [BUBBLE_LOOKS[id].day, BUBBLE_LOOKS[id].dusk]) {
      expect(contrast(look.fg, look.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(look.sub, look.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
