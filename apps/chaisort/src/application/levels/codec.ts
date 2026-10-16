import {
  HIDDEN,
  ingOf,
  isHidden,
  type CupSpec,
  type Lesson,
  type Level,
} from '@/domain/entities/Level';

/**
 * Levels as short strings, so 300 of them ship as a small file:
 * `id;best;par;lesson;cups`, cups separated by commas, each
 * `cap[Llid]:layers` with one letter per layer (a = ingredient 0), upper
 * case when it is hidden under froth. `12;14;16;;4:abca,4:bcab,4:,4:`.
 */
const LESSONS: readonly Lesson[] = [
  'pour',
  'match',
  'serve',
  'froth',
  'oneSpare',
  'lid',
  'tall',
  'spice',
];

function layerChar(l: number): string {
  return String.fromCharCode((isHidden(l) ? 65 : 97) + ingOf(l));
}

function charLayer(ch: string): number {
  const code = ch.charCodeAt(0);
  return code >= 97 ? code - 97 : (code - 65) | HIDDEN;
}

export function encodeLevel(level: Level): string {
  const cups = level.cups
    .map((c) => `${c.cap}${c.lid > 0 ? `L${c.lid}` : ''}:${c.layers.map(layerChar).join('')}`)
    .join(',');
  return [level.id, level.best, level.par, level.lesson ?? '', cups].join(';');
}

export function decodeLevel(text: string): Level {
  const [id, best, par, lesson, cups] = text.split(';');
  if (id === undefined || cups === undefined) throw new Error(`Bad level: ${text}`);
  const parsed: CupSpec[] = cups.split(',').map((c) => {
    const [head = '4', layers = ''] = c.split(':');
    const [cap, lid] = head.split('L');
    return { cap: Number(cap), lid: lid ? Number(lid) : 0, layers: [...layers].map(charLayer) };
  });
  const known = LESSONS.find((l) => l === lesson);
  return {
    id,
    best: Number(best),
    par: Number(par),
    cups: parsed,
    ...(known ? { lesson: known } : {}),
  };
}
