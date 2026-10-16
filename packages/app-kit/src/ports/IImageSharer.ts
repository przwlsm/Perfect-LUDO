/** Hands a finished picture to the system share sheet (save, send, post). */
export interface IImageSharer {
  supported(): Promise<boolean>;
  /** `base64Png` without a data: prefix. Resolves once the sheet closes. */
  sharePng(base64Png: string, fileName: string, dialogTitle: string): Promise<void>;
}
