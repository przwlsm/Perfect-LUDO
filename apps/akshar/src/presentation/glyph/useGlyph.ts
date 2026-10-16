import { useMemo } from 'react';
import { Skia, type SkPath } from '@shopify/react-native-skia';
import { analyseGlyph, type Contains, type GlyphShape } from '@/application/glyph/centreline';
import {
  boundsOf,
  fitToBox,
  flatten,
  makeContains,
  toSvg,
  transformCmds,
  type Cmd,
  type Rect,
} from '@/application/glyph/path';
import type { ScriptFont } from '@/domain/entities/Script';
import { useOutlineSource } from './useOutlineSource';

/** A letter placed in a square writing box, ready to draw, trace and score. */
export interface BoxedGlyph {
  readonly char: string;
  readonly box: number;
  readonly path: SkPath;
  readonly contains: Contains;
  readonly bounds: Rect;
  readonly shape: GlyphShape;
}

/**
 * Centres and scales a raw outline (font units at OUTLINE_SIZE) into a
 * `box`-sized square, then reads its shape for the dotted guide and scoring.
 */
export function boxGlyph(
  char: string,
  cmds: readonly Cmd[],
  box: number,
  fill = 0.74,
  cell = Math.max(2, box / 90),
): BoxedGlyph | null {
  const raw = flatten(cmds, 6);
  if (raw.length === 0) return null;
  // A small mark (the Tamil āytam, the hamza) stays small rather than ballooning.
  const fit = fitToBox(boundsOf(raw), box, fill, box * 0.00118);
  const placed = transformCmds(cmds, fit.scale, fit.dx, fit.dy);
  const polys = flatten(placed, 6);
  const contains = makeContains(polys);
  const bounds = boundsOf(polys);
  const shape = analyseGlyph(contains, { x: 0, y: 0, width: box, height: box }, cell);
  const path = Skia.Path.MakeFromSVGString(toSvg(placed)) ?? Skia.Path.Make();
  return { char, box, path, contains, bounds, shape };
}

export function useGlyph(font: ScriptFont, char: string, box: number): BoxedGlyph | null {
  const source = useOutlineSource(font);
  return useMemo(
    () => (source && box > 0 ? boxGlyph(char, source(char), box) : null),
    [source, char, box],
  );
}
