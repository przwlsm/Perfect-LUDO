/**
 * Chat colours: how your own bubbles (and the show-to-a-local card) look.
 * Classic is free; the rest come with Plus or a day with a video.
 */
export type BubbleId = 'classic' | 'marigold' | 'monsoon' | 'jasmine' | 'chilli';

export interface BubbleTheme {
  readonly id: BubbleId;
  readonly premium: boolean;
}

export const BUBBLES: readonly BubbleTheme[] = [
  { id: 'classic', premium: false },
  { id: 'marigold', premium: true },
  { id: 'monsoon', premium: true },
  { id: 'jasmine', premium: true },
  { id: 'chilli', premium: true },
];

export const BUBBLE_IDS: readonly BubbleId[] = BUBBLES.map((b) => b.id);

/** The day-pass id for a premium item. */
export function passId(kind: 'pack' | 'bubbles', id: string): string {
  return `${kind}:${id}`;
}
