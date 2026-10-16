import * as Clipboard from 'expo-clipboard';
import type { IClipboard } from '@/domain/ports/IClipboard';

export class ExpoClipboard implements IClipboard {
  async copy(text: string): Promise<boolean> {
    try {
      return await Clipboard.setStringAsync(text);
    } catch {
      return false;
    }
  }
}
