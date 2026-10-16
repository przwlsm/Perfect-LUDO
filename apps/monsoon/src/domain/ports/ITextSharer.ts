/** Hands a short text (a daily result) to the system share sheet. */
export interface ITextSharer {
  /** Resolves once the sheet closes: 'shared', 'copied' (web fallback) or 'failed'. */
  shareText(text: string): Promise<'shared' | 'copied' | 'failed'>;
}
