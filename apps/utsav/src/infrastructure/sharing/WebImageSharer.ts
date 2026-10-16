import type { IImageSharer } from 'app-kit';

/**
 * Sharing in a browser: the Web Share API with the picture where the
 * browser supports files (most phones), otherwise a plain download.
 */
export class WebImageSharer implements IImageSharer {
  supported(): Promise<boolean> {
    return Promise.resolve(typeof document !== 'undefined');
  }

  async sharePng(base64Png: string, fileName: string, dialogTitle: string): Promise<void> {
    const bytes = Uint8Array.from(atob(base64Png), (ch) => ch.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'image/png' });
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share && typeof File !== 'undefined') {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: dialogTitle });
          return;
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return;
        }
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
