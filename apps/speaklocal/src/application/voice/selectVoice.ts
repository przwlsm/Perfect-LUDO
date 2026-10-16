import type { DeviceVoice } from '@/domain/ports';

/**
 * Choosing the default voice: a female ("lady") voice wherever the device
 * lets us tell.
 *
 * Neither iOS nor Android tells an app a voice's gender: expo-speech gives
 * only an identifier, a name, a quality and a language. So we read the
 * hints that voices carry in their names, from a small table we can
 * justify, and never fake a gender by changing pitch:
 *
 * 1. Words: "female" / "male" in the name or identifier.
 * 2. Samsung TTS ids end in `SMTf00` (female) or `SMTm00` (male).
 * 3. Google TTS ids for most Indian languages are `<ll>-in-x-<ll>f-…`
 *    (female) and `<ll>-in-x-<ll>m-…` (male), e.g. `kn-in-x-knf-local`.
 *    Hindi uses lettered voices: `hia`/`hic` female, `hid`/`hie` male.
 * 4. Known names: Apple and Microsoft name their voices after people
 *    (Lekha, Swara, Pallavi, Sapna, Shruti, Aarohi, Tanishaa, Sobhana…).
 *
 * Then: female first, unknown next, male last; within that, enhanced
 * quality first, then on-device ("local") before network voices, so the
 * app keeps speaking offline. Learners can pick any voice in Settings.
 */

export type VoiceGender = 'female' | 'male' | 'unknown';

/** Voice names known to be female (Apple, Microsoft); lower case. */
export const FEMALE_NAMES: readonly string[] = [
  // Apple (iOS/macOS): Hindi, and the Indian-language voices added in iOS 17.
  'lekha',
  'kiyara',
  'soumya',
  'vani',
  'geeta',
  'piya',
  'minu',
  // Microsoft (Windows, Edge, Azure neural voices) for Indian languages.
  'swara',
  'kalpana',
  'pallavi',
  'sapna',
  'shruti',
  'aarohi',
  'tanishaa',
  'sobhana',
  'neerja',
  'heera',
];

/** Voice names known to be male; lower case. */
export const MALE_NAMES: readonly string[] = [
  'rishi',
  'madhur',
  'hemant',
  'ravi',
  'prabhat',
  'valluvar',
  'gagan',
  'mohan',
  'manohar',
  'bashkar',
  'midhun',
];

/** Google's lettered Hindi voices, by their code. */
const GOOGLE_HINDI: Readonly<Record<string, VoiceGender>> = {
  hia: 'female',
  hic: 'female',
  hid: 'male',
  hie: 'male',
};

const THREE_LETTER: Readonly<Record<string, string>> = {
  kan: 'kn',
  tam: 'ta',
  tel: 'te',
  mar: 'mr',
  ben: 'bn',
  mal: 'ml',
  hin: 'hi',
};

/** "kn_IN", "kn-in", "kan-IND" → { lang: 'kn', region: 'in' }. */
export function parseTag(tag: string): { lang: string; region: string } {
  const [l = '', r = ''] = tag.replace(/_/g, '-').toLowerCase().split('-');
  return { lang: THREE_LETTER[l] ?? l, region: r === 'ind' ? 'in' : r };
}

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(text);
}

export function voiceGender(v: DeviceVoice): VoiceGender {
  const text = `${v.name} ${v.id}`.toLowerCase();
  if (hasWord(text, 'female') || hasWord(text, 'woman')) return 'female';
  if (hasWord(text, 'male') || hasWord(text, 'man')) return 'male';
  if (/smtf\d/.test(text)) return 'female';
  if (/smtm\d/.test(text)) return 'male';
  const google = /-x-([a-z]{3})-/.exec(text);
  if (google) {
    const code = google[1]!;
    const hindi = GOOGLE_HINDI[code];
    if (hindi) return hindi;
    if (code.endsWith('f')) return 'female';
    if (code.endsWith('m')) return 'male';
  }
  if (FEMALE_NAMES.some((n) => hasWord(text, n))) return 'female';
  if (MALE_NAMES.some((n) => hasWord(text, n))) return 'male';
  return 'unknown';
}

/** The device's voices for a language: same region first ("kn-IN"), then any ("kn-…"). */
export function voicesFor(all: readonly DeviceVoice[], tag: string): DeviceVoice[] {
  const want = parseTag(tag);
  const same = all.filter((v) => {
    const t = parseTag(v.language);
    return t.lang === want.lang && t.region === want.region;
  });
  const other = all.filter((v) => {
    const t = parseTag(v.language);
    return t.lang === want.lang && t.region !== want.region;
  });
  return [...rankVoices(same), ...rankVoices(other)];
}

const GENDER_ORDER: Readonly<Record<VoiceGender, number>> = { female: 0, unknown: 1, male: 2 };
const isNetwork = (v: DeviceVoice) => /network/i.test(v.id);

/** Female first, then quality, then on-device, then a stable order. */
export function rankVoices(voices: readonly DeviceVoice[]): DeviceVoice[] {
  return [...voices].sort(
    (a, b) =>
      GENDER_ORDER[voiceGender(a)] - GENDER_ORDER[voiceGender(b)] ||
      Number(b.enhanced) - Number(a.enhanced) ||
      Number(isNetwork(a)) - Number(isNetwork(b)) ||
      a.id.localeCompare(b.id),
  );
}

/** The voice to speak a language with: the learner's choice if still there, else our pick. */
export function chooseVoice(
  all: readonly DeviceVoice[],
  tag: string,
  saved?: string,
): DeviceVoice | null {
  const options = voicesFor(all, tag);
  return options.find((v) => v.id === saved) ?? options[0] ?? null;
}
