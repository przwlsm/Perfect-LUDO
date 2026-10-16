import { isCardLanguage, type CardLanguage } from './Language';
import { isOccasionId, type OccasionId } from './Occasion';
import { TYPE_STYLES, type TypeStyle } from './Template';

/** Square for chats; status/story for WhatsApp Status and Instagram Stories. */
export type CardFormat = 'square' | 'story';
export type PhotoShape = 'circle' | 'arch';

/**
 * The sender's photo inside its frame. `zoom` ≥ 1 enlarges it beyond
 * "just covers the frame"; `x`/`y` in -1…1 slide it across whatever
 * overflows (0 = centred).
 */
export interface PhotoSpec {
  readonly uri: string;
  readonly shape: PhotoShape;
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

/** Everything needed to draw a card again, exactly. */
export interface CardSpec {
  readonly templateId: string;
  readonly occasion: OccasionId;
  /** Index into the template's palettes. */
  readonly palette: number;
  readonly language: CardLanguage;
  readonly headline: string;
  readonly message: string;
  /** The sender's name for the sign-off; empty for none. */
  readonly from: string;
  readonly photo: PhotoSpec | null;
  readonly format: CardFormat;
  /** Lettering chosen by the sender (Plus); null keeps the template's own. */
  readonly type: TypeStyle | null;
}

/** A card in "My cards". */
export interface SavedCard {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  /** True once it has been shared at least once. */
  readonly sent: boolean;
  readonly spec: CardSpec;
}

export const MAX_SAVED_CARDS = 60;

export const LIMITS = { headline: 60, message: 280, from: 40 } as const;

function text(v: unknown, max: number): string | null {
  return typeof v === 'string' ? v.slice(0, max) : null;
}

function num(v: unknown, lo: number, hi: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}

export function parsePhoto(v: unknown): PhotoSpec | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as Partial<PhotoSpec>;
  if (typeof p.uri !== 'string' || p.uri === '') return null;
  return {
    uri: p.uri,
    shape: p.shape === 'arch' ? 'arch' : 'circle',
    zoom: num(p.zoom, 1, 4, 1),
    x: num(p.x, -1, 1, 0),
    y: num(p.y, -1, 1, 0),
  };
}

/** A stored spec, or null when it is too damaged to draw. */
export function parseSpec(v: unknown): CardSpec | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Record<string, unknown>;
  const headline = text(s.headline, LIMITS.headline);
  const message = text(s.message, LIMITS.message);
  if (typeof s.templateId !== 'string' || !isOccasionId(s.occasion)) return null;
  if (!isCardLanguage(s.language) || headline === null || message === null) return null;
  return {
    templateId: s.templateId,
    occasion: s.occasion,
    palette: Math.round(num(s.palette, 0, 99, 0)),
    language: s.language,
    headline,
    message,
    from: text(s.from, LIMITS.from) ?? '',
    photo: parsePhoto(s.photo),
    format: s.format === 'story' ? 'story' : 'square',
    type: TYPE_STYLES.includes(s.type as TypeStyle) ? (s.type as TypeStyle) : null,
  };
}

export function parseSavedCards(raw: string | null): SavedCard[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    const cards: SavedCard[] = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const c = item as Record<string, unknown>;
      const spec = parseSpec(c.spec);
      if (!spec || typeof c.id !== 'string') continue;
      const createdAt = num(c.createdAt, 0, Number.MAX_SAFE_INTEGER, 0);
      cards.push({
        id: c.id,
        createdAt,
        updatedAt: num(c.updatedAt, 0, Number.MAX_SAFE_INTEGER, createdAt),
        sent: c.sent === true,
        spec,
      });
    }
    return cards.slice(0, MAX_SAVED_CARDS);
  } catch {
    return [];
  }
}

/**
 * The list after saving `spec`: a known id is updated and moves to the
 * front; a new card goes first and the oldest falls off past the limit.
 */
export function upsertCard(
  cards: readonly SavedCard[],
  id: string,
  spec: CardSpec,
  now: number,
  sent: boolean,
): SavedCard[] {
  const existing = cards.find((c) => c.id === id);
  const card: SavedCard = {
    id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    sent: sent || (existing?.sent ?? false),
    spec,
  };
  return [card, ...cards.filter((c) => c.id !== id)].slice(0, MAX_SAVED_CARDS);
}

/** The sign-off and words as plain text, for pasting under the image. */
export function cardAsText(spec: CardSpec, signOff: string): string {
  return [spec.headline.trim(), spec.message.trim(), signOff.trim()].filter(Boolean).join('\n\n');
}
