import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { Pt } from '@/application/glyph/path';
import { penOutline, type PenSample, type PenStyle } from '@/application/pen/pen';

export interface InkStroke {
  readonly samples: readonly PenSample[];
  readonly path: SkPath;
}

/** A pen outline polygon as a smooth closed path: curves through the edge midpoints. */
export function outlinePath(poly: readonly number[]): SkPath {
  const b = Skia.PathBuilder.Make();
  const n = poly.length / 2;
  if (n >= 3) {
    const mid = (i: number, j: number): [number, number] => [
      (poly[2 * i]! + poly[2 * j]!) / 2,
      (poly[2 * i + 1]! + poly[2 * j + 1]!) / 2,
    ];
    const [sx, sy] = mid(n - 1, 0);
    b.moveTo(sx, sy);
    for (let i = 0; i < n; i++) {
      const [mx, my] = mid(i, (i + 1) % n);
      b.quadTo(poly[2 * i]!, poly[2 * i + 1]!, mx, my);
    }
    b.close();
  }
  return b.build();
}

export interface Ink {
  readonly strokes: readonly InkStroke[];
  readonly live: SkPath | null;
  /** All finished strokes as one path, for a single draw call. */
  readonly settled: SkPath;
  readonly last: SkPath | null;
  readonly empty: boolean;
  begin(x: number, y: number): void;
  /** Adds a sample; returns the distance moved (0 when ignored). */
  move(x: number, y: number): number;
  end(): void;
  undo(): void;
  clear(): void;
  /** The strokes as plain points, for scoring. */
  points(): Pt[][];
}

/**
 * The learner's strokes. The stroke being written is rebuilt on every move
 * (it is short); finished strokes are outlined once and merged into one
 * path so a full slate still draws in a single call.
 */
export function useInk(style: PenStyle): Ink {
  const [strokes, setStrokes] = useState<readonly InkStroke[]>([]);
  const [live, setLive] = useState<SkPath | null>(null);
  const samples = useRef<PenSample[]>([]);
  const started = useRef(0);
  const drawing = useRef(false);
  const styleRef = useRef(style);
  useEffect(() => {
    styleRef.current = style;
  }, [style]);

  const begin = useCallback((x: number, y: number) => {
    drawing.current = true;
    started.current = Date.now();
    samples.current = [{ x, y, t: 0 }];
    setLive(outlinePath(penOutline(samples.current, styleRef.current)));
  }, []);

  const move = useCallback((x: number, y: number) => {
    if (!drawing.current) return 0;
    const last = samples.current[samples.current.length - 1]!;
    const step = Math.hypot(x - last.x, y - last.y);
    if (step < 1) return 0;
    samples.current.push({ x, y, t: Date.now() - started.current });
    setLive(outlinePath(penOutline(samples.current, styleRef.current)));
    return step;
  }, []);

  const end = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    const done = samples.current;
    samples.current = [];
    setLive(null);
    if (done.length === 0) return;
    const path = outlinePath(penOutline(done, styleRef.current));
    setStrokes((s) => [...s, { samples: done, path }]);
  }, []);

  const undo = useCallback(() => setStrokes((s) => s.slice(0, -1)), []);
  const clear = useCallback(() => setStrokes([]), []);

  const settled = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (const s of strokes) b.addPath(s.path);
    return b.build();
  }, [strokes]);

  return {
    strokes,
    live,
    settled,
    last: strokes[strokes.length - 1]?.path ?? null,
    empty: strokes.length === 0,
    begin,
    move,
    end,
    undo,
    clear,
    points: () => strokes.map((s) => s.samples.map((p) => ({ x: p.x, y: p.y }))),
  };
}
