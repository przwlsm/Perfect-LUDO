import { PixelRatio } from 'react-native';
import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';

/**
 * Paints `draw` once into an image at screen resolution. Toys bake finished
 * work into one of these, so each frame redraws a single image plus the
 * stroke in progress, not every stroke ever drawn.
 */
export function rasterize(
  width: number,
  height: number,
  draw: (canvas: SkCanvas) => void,
): SkImage | null {
  const scale = PixelRatio.get();
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const surface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  draw(canvas);
  surface.flush();
  const image = surface.makeImageSnapshot();
  return image.makeNonTextureImage() ?? image;
}
