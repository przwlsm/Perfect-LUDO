import { OCCASIONS, type OccasionId } from '@/domain/entities/Occasion';

/** Lower case, accents stripped, punctuation and runs of spaces folded to one space. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_.,!?'’"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Occasions matching what the sender typed, best first: the display name
 * (`names`, in the app's language) beats an alias, and a word that starts
 * with the query beats one that merely contains it. An empty query
 * matches nothing; callers show the full grid then.
 */
export function searchOccasions(
  query: string,
  names: Readonly<Record<OccasionId, string>>,
): OccasionId[] {
  const q = normalize(query);
  if (!q) return [];
  const scored: { id: OccasionId; score: number; order: number }[] = [];
  OCCASIONS.forEach((occasion, order) => {
    const candidates = [names[occasion.id], ...occasion.aliases].map(normalize);
    let best = 0;
    candidates.forEach((text, i) => {
      const weight = i === 0 ? 2 : 1;
      let score = 0;
      if (text === q) score = 4;
      else if (text.startsWith(q) || text.split(' ').some((w) => w.startsWith(q))) score = 3;
      else if (text.includes(q)) score = 2;
      else if (q.length >= 3 && q.split(' ').every((part) => text.includes(part))) score = 1;
      best = Math.max(best, score * weight);
    });
    if (best > 0) scored.push({ id: occasion.id, score: best, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((s) => s.id);
}
