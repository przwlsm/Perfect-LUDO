/** Copies plain text, such as a card's words to paste under the picture. */
export interface IClipboard {
  copy(text: string): Promise<boolean>;
}
