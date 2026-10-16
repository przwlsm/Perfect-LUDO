import { useEffect, useMemo, useState } from 'react';
import { loadData } from '@shopify/react-native-skia';
import { readTrueType, type TrueTypeFont } from '@/application/glyph/ttf';
import type { ScriptFont } from '@/domain/entities/Script';
import { OUTLINE_SIZE, SCRIPT_FONT_FILES } from './fonts';
import type { OutlineOf } from './useOutlineSource';

const cache = new Map<ScriptFont, Promise<TrueTypeFont | null>>();

/** Fetches a font file through Skia's own asset loader and reads its outlines. */
function loadFont(font: ScriptFont): Promise<TrueTypeFont | null> {
  let p = cache.get(font);
  if (!p) {
    p = loadData(SCRIPT_FONT_FILES[font], (data) => data)
      .then((data) => {
        // On the web an SkData wraps the file's ArrayBuffer.
        const bytes = (data as unknown as { ref?: ArrayBuffer } | null)?.ref;
        return bytes ? readTrueType(bytes) : null;
      })
      .catch(() => {
        cache.delete(font);
        return null;
      });
    cache.set(font, p);
  }
  return p;
}

/**
 * In a browser, CanvasKit cannot turn text into a path, so the letter's
 * outline is read from the same Baloo font file with Akshar's small
 * TrueType reader. Same font, same outline, same coordinates as on phones.
 */
export function useOutlineSource(font: ScriptFont): OutlineOf | null {
  const [loaded, setLoaded] = useState<{ font: ScriptFont; tt: TrueTypeFont } | null>(null);
  useEffect(() => {
    let live = true;
    void loadFont(font).then((tt) => {
      if (live && tt) setLoaded({ font, tt });
    });
    return () => {
      live = false;
    };
  }, [font]);
  return useMemo<OutlineOf | null>(() => {
    if (!loaded || loaded.font !== font) return null;
    const tt = loaded.tt;
    return (char) => tt.outline(char, OUTLINE_SIZE, 0, OUTLINE_SIZE);
  }, [loaded, font]);
}
