import { useEffect, useState } from 'react';
import {
  ImageFormat,
  Skia,
  type SkImage,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { templateById } from '@/application/catalogue/templates';
import { cardSize } from '@/application/layout';
import type { CardSpec } from '@/domain/entities/Card';
import { useCardFonts } from './fonts';
import {
  layoutCard,
  paintBack,
  paintCard,
  paintFront,
  type CardLayout,
  type PaintInput,
} from './paint/card';
import type { Point } from './paint/kit';
import { loadPhoto } from './photo';

/** Paints a card into a new image `widthPx` wide (the height follows the format). */
export function renderCard(
  input: PaintInput,
  widthPx: number,
  watermark: string | null,
): SkImage | null {
  const { w, h } = cardSize(input.spec.format);
  const scale = widthPx / w;
  const surface = Skia.Surface.Make(Math.round(w * scale), Math.round(h * scale));
  if (!surface) return null;
  const c = surface.getCanvas();
  c.scale(scale, scale);
  paintCard(c, input, watermark);
  surface.flush();
  return surface.makeImageSnapshot();
}

function surfaceFor(input: PaintInput, widthPx: number) {
  const { w, h } = cardSize(input.spec.format);
  const scale = widthPx / w;
  const surface = Skia.Surface.Make(Math.round(w * scale), Math.round(h * scale));
  if (surface) surface.getCanvas().scale(scale, scale);
  return surface;
}

/** The art layer for the live preview (it changes only with the template, palette or size). */
export function renderBack(
  input: PaintInput,
  widthPx: number,
): { image: SkImage; fx: Point[]; lights: Point[] } | null {
  const surface = surfaceFor(input, widthPx);
  if (!surface) return null;
  const { fx, lights } = paintBack(surface.getCanvas(), input);
  surface.flush();
  return { image: surface.makeImageSnapshot(), fx, lights };
}

/** The words layer for the live preview, plus where everything sits. */
export function renderFront(
  input: PaintInput,
  widthPx: number,
): { image: SkImage; layout: CardLayout } | null {
  const surface = surfaceFor(input, widthPx);
  if (!surface) return null;
  const c = surface.getCanvas();
  c.clear(Skia.Color('transparent'));
  const layout = layoutCard(input);
  paintFront(c, input, layout);
  surface.flush();
  return { image: surface.makeImageSnapshot(), layout };
}

export function toBase64(image: SkImage, format: 'png' | 'jpeg' = 'png'): string {
  return format === 'png'
    ? image.encodeToBase64(ImageFormat.PNG, 100)
    : image.encodeToBase64(ImageFormat.JPEG, 88);
}

/* ------------------------------------------------------------------ */
/* Thumbnails: drawn one at a time off the critical path, then cached.  */
/* ------------------------------------------------------------------ */

const thumbs = new Map<string, string>();
const MAX_THUMBS = 120;
type Job = {
  key: string;
  run: () => Promise<string | null>;
  done: ((uri: string | null) => void)[];
};
const queue: Job[] = [];
const pending = new Map<string, Job>();
let busy = false;

function pump(): void {
  if (busy) return;
  const job = queue.shift();
  if (!job) return;
  busy = true;
  // Yield a frame first so scrolling and taps stay smooth between cards.
  setTimeout(() => {
    void job
      .run()
      .catch(() => null)
      .then((uri) => {
        pending.delete(job.key);
        if (uri) {
          thumbs.set(job.key, uri);
          if (thumbs.size > MAX_THUMBS) thumbs.delete(thumbs.keys().next().value!);
        }
        for (const cb of job.done) cb(uri);
        busy = false;
        pump();
      });
  }, 16);
}

function request(
  key: string,
  run: () => Promise<string | null>,
  done: (uri: string | null) => void,
  urgent: boolean,
): () => void {
  let job = pending.get(key);
  if (!job) {
    job = { key, run, done: [] };
    pending.set(key, job);
    if (urgent) queue.unshift(job);
    else queue.push(job);
  }
  job.done.push(done);
  const mine = job;
  pump();
  return () => {
    const i = mine.done.indexOf(done);
    if (i >= 0) mine.done.splice(i, 1);
    // Nobody is waiting any more: drop it if it has not started.
    if (mine.done.length === 0) {
      const at = queue.indexOf(mine);
      if (at >= 0) {
        queue.splice(at, 1);
        pending.delete(key);
      }
    }
  };
}

interface ThumbOptions {
  readonly plus: boolean;
  readonly watermark?: string | null;
  /** Jump the queue (the card the sender is looking at). */
  readonly urgent?: boolean;
}

/** A data: URI of the card drawn `widthPx` wide, or null while it is being drawn. */
export function useCardThumb(
  spec: CardSpec | null,
  widthPx: number,
  options: ThumbOptions,
): string | null {
  const fonts = useCardFonts();
  const px = Math.max(64, Math.round(widthPx));
  const key =
    spec && fonts
      ? `${px}|${options.plus}|${options.watermark ?? ''}|${JSON.stringify(spec)}`
      : null;
  const [state, setState] = useState<{ key: string; uri: string | null } | null>(null);
  const cached = key ? thumbs.get(key) : undefined;
  useEffect(() => {
    if (!key || !spec || !fonts || thumbs.has(key)) return;
    const template = templateById(spec.templateId);
    if (!template) return;
    return request(
      key,
      () => drawThumb(spec, fonts, px, options.plus, options.watermark ?? null),
      (uri) => setState({ key, uri }),
      options.urgent ?? false,
    );
    // The key captures every input that changes the picture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return null;
  return cached ?? (state?.key === key ? state.uri : null);
}

async function drawThumb(
  spec: CardSpec,
  fonts: SkTypefaceFontProvider,
  px: number,
  plus: boolean,
  watermark: string | null,
): Promise<string | null> {
  const template = templateById(spec.templateId);
  if (!template) return null;
  const photo = spec.photo ? await loadPhoto(spec.photo.uri) : null;
  const image = renderCard({ spec, template, plus, fonts, photo }, px, watermark);
  return image ? `data:image/jpeg;base64,${toBase64(image, 'jpeg')}` : null;
}
