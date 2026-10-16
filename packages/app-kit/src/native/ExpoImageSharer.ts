import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { IImageSharer } from '../ports/IImageSharer';

/**
 * Writes the picture to the cache and opens the system share sheet, from
 * which the player can save it to their photos or send it anywhere. No
 * photo-library permission is ever requested.
 */
export class ExpoImageSharer implements IImageSharer {
  supported(): Promise<boolean> {
    return Sharing.isAvailableAsync().catch(() => false);
  }

  async sharePng(base64Png: string, fileName: string, dialogTitle: string): Promise<void> {
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(base64Png, { encoding: 'base64' });
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
  }
}
