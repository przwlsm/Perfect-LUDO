import { useCallback } from 'react';
import { Skia, useFont } from '@shopify/react-native-skia';
import type { Cmd } from '@/application/glyph/path';
import type { ScriptFont } from '@/domain/entities/Script';
import { OUTLINE_SIZE, SCRIPT_FONT_FILES } from './fonts';

export type OutlineOf = (char: string) => Cmd[];

/**
 * On phones, Skia draws the letter's outline straight from the font:
 * `Skia.Path.MakeFromText` with the script's Baloo face (loaded with
 * `useFont`), baseline at y = OUTLINE_SIZE. Null until the font is loaded.
 */
export function useOutlineSource(font: ScriptFont): OutlineOf | null {
  const skFont = useFont(SCRIPT_FONT_FILES[font], OUTLINE_SIZE);
  const outline = useCallback(
    (char: string): Cmd[] => {
      if (!skFont) return [];
      const path = Skia.Path.MakeFromText(char, 0, OUTLINE_SIZE, skFont);
      return path ? path.toCmds() : [];
    },
    [skFont],
  );
  return skFont ? outline : null;
}
