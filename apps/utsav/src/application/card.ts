import { isOpen, type Entitlements } from 'app-kit';
import type { CardFormat, CardSpec } from '@/domain/entities/Card';
import { LANGUAGE_INFO, type CardLanguage } from '@/domain/entities/Language';
import type { Template, TypeStyle } from '@/domain/entities/Template';
import { defaultWords, messagesFor } from './messages';

/** A fresh card for a template, in the sender's language and with their name. */
export function newCard(
  template: Template,
  language: CardLanguage,
  from: string,
  seed = 0,
): CardSpec {
  return {
    templateId: template.id,
    occasion: template.occasion,
    palette: 0,
    language,
    ...defaultWords(template.occasion, language, seed),
    from,
    photo: null,
    format: 'square',
    type: null,
  };
}

/**
 * Moves a card to another template. Words stay when the occasion is the
 * same (the sender may have written them); the palette starts over.
 */
export function withTemplate(spec: CardSpec, template: Template): CardSpec {
  if (template.occasion === spec.occasion) {
    return { ...spec, templateId: template.id, palette: 0 };
  }
  return {
    ...spec,
    templateId: template.id,
    occasion: template.occasion,
    palette: 0,
    ...defaultWords(template.occasion, spec.language),
  };
}

/**
 * Switches the card's language. The greeting and message are replaced by
 * the same-position suggestion in the new language when they were
 * suggestions; words the sender wrote themselves are kept.
 */
export function withLanguage(spec: CardSpec, language: CardLanguage): CardSpec {
  if (language === spec.language) return spec;
  const from = messagesFor(spec.occasion, spec.language);
  const to = messagesFor(spec.occasion, language);
  const swap = (list: readonly string[], target: readonly string[], text: string) => {
    const at = list.indexOf(text);
    if (at >= 0) return target[Math.min(at, target.length - 1)]!;
    return text.trim() === '' ? text : null;
  };
  const headline = swap(from.headlines, to.headlines, spec.headline);
  const message = swap(from.messages, to.messages, spec.message);
  return {
    ...spec,
    language,
    headline: headline ?? spec.headline,
    message: message ?? spec.message,
  };
}

/** The palette index wrapped into the template's range. */
export function paletteIndex(template: Template, index: number): number {
  const n = template.palettes.length;
  return ((Math.round(index) % n) + n) % n;
}

/**
 * Lettering choices that actually look different in a language: Latin has
 * all five; Devanagari has festive (Yatra One), hand (Kalam) and round
 * (Baloo); other scripts have one family, so there is nothing to choose.
 */
export function typeStylesFor(language: CardLanguage): readonly TypeStyle[] {
  switch (LANGUAGE_INFO[language].script) {
    case 'latin':
      return ['festive', 'elegant', 'script', 'hand', 'round'];
    case 'devanagari':
      return ['festive', 'hand', 'round'];
    default:
      return [];
  }
}

/** The lettering the card is drawn with: the sender's pick (if Plus allows it) or the template's. */
export function effectiveType(spec: CardSpec, template: Template, plus: boolean): TypeStyle {
  return plus && spec.type ? spec.type : template.type;
}

export interface ExportPlan {
  readonly format: CardFormat;
  readonly width: number;
  readonly height: number;
  /** The small "Utsav" mark; Plus removes it. */
  readonly watermark: boolean;
}

/**
 * What a shared card is rendered as. Everyone gets a crisp square card;
 * Plus adds full HD, the tall status size and no mark.
 */
export function exportPlan(format: CardFormat, plus: boolean): ExportPlan {
  if (!plus) return { format: 'square', width: 720, height: 720, watermark: true };
  return format === 'story'
    ? { format, width: 1080, height: 1920, watermark: false }
    : { format, width: 1080, height: 1080, watermark: false };
}

/** Premium templates open with Plus or a live day pass from a rewarded video. */
export function templateOpen(e: Entitlements, template: Template, now: number): boolean {
  return isOpen(e, template, now);
}
