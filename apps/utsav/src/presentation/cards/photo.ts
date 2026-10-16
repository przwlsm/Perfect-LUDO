import { useEffect, useState } from 'react';
import { Skia, type SkImage } from '@shopify/react-native-skia';

/** Photos are decoded once and kept small enough to draw quickly. */
const MAX_SIDE = 1400;
const cache = new Map<string, Promise<SkImage | null>>();

function shrink(img: SkImage): SkImage {
  const w = img.width();
  const h = img.height();
  const scale = MAX_SIDE / Math.max(w, h);
  if (scale >= 1) return img;
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const surface = Skia.Surface.Make(tw, th);
  if (!surface) return img;
  const p = Skia.Paint();
  p.setAntiAlias(true);
  surface.getCanvas().drawImageRect(img, Skia.XYWHRect(0, 0, w, h), Skia.XYWHRect(0, 0, tw, th), p);
  surface.flush();
  const out = surface.makeImageSnapshot();
  return out.makeNonTextureImage() ?? out;
}

/** The photo at `uri`, decoded (and shrunk); null when it cannot be read. */
export function loadPhoto(uri: string): Promise<SkImage | null> {
  let job = cache.get(uri);
  if (!job) {
    job = Skia.Data.fromURI(uri)
      .then((data) => {
        const img = Skia.Image.MakeImageFromEncoded(data);
        return img ? shrink(img) : null;
      })
      .catch(() => null);
    cache.set(uri, job);
    // A failed read may succeed later (a file still being copied), so it is not cached.
    void job.then((img) => {
      if (!img) cache.delete(uri);
    });
  }
  return job;
}

export function usePhoto(uri: string | null | undefined): SkImage | null {
  const [state, setState] = useState<{ uri: string; image: SkImage | null } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let live = true;
    void loadPhoto(uri).then((image) => {
      if (live) setState({ uri, image });
    });
    return () => {
      live = false;
    };
  }, [uri]);
  return uri && state?.uri === uri ? state.image : null;
}
