import { Platform, Share } from 'react-native';
import type { ITextSharer } from '@/domain/ports/ITextSharer';

/**
 * React Native's share sheet; in a browser, the Web Share API where there
 * is one, else the clipboard.
 */
export class NativeTextSharer implements ITextSharer {
  async shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
    try {
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav && typeof nav.share === 'function') {
          await nav.share({ text });
          return 'shared';
        }
        if (nav?.clipboard) {
          await nav.clipboard.writeText(text);
          return 'copied';
        }
        return 'failed';
      }
      await Share.share({ message: text });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
}
