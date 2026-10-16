import type { VoiceLanguage } from '@/domain/entities/Settings';

/**
 * What the caller says for each number, in the style of a housie caller:
 * "Two and two, twenty-two". In Hindi the words are written in Devanagari
 * so the device's Hindi voice pronounces them properly.
 */
const EN_ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const EN_TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

export function englishWord(n: number): string {
  if (n < 20) return EN_ONES[n] ?? String(n);
  const tens = EN_TENS[Math.floor(n / 10)] ?? '';
  const ones = n % 10;
  return ones === 0 ? tens : `${tens}-${EN_ONES[ones]}`;
}

const HI = [
  'शून्य',
  'एक',
  'दो',
  'तीन',
  'चार',
  'पाँच',
  'छह',
  'सात',
  'आठ',
  'नौ',
  'दस',
  'ग्यारह',
  'बारह',
  'तेरह',
  'चौदह',
  'पंद्रह',
  'सोलह',
  'सत्रह',
  'अठारह',
  'उन्नीस',
  'बीस',
  'इक्कीस',
  'बाईस',
  'तेईस',
  'चौबीस',
  'पच्चीस',
  'छब्बीस',
  'सत्ताईस',
  'अट्ठाईस',
  'उनतीस',
  'तीस',
  'इकतीस',
  'बत्तीस',
  'तैंतीस',
  'चौंतीस',
  'पैंतीस',
  'छत्तीस',
  'सैंतीस',
  'अड़तीस',
  'उनतालीस',
  'चालीस',
  'इकतालीस',
  'बयालीस',
  'तैंतालीस',
  'चवालीस',
  'पैंतालीस',
  'छियालीस',
  'सैंतालीस',
  'अड़तालीस',
  'उनचास',
  'पचास',
  'इक्यावन',
  'बावन',
  'तिरेपन',
  'चौवन',
  'पचपन',
  'छप्पन',
  'सत्तावन',
  'अट्ठावन',
  'उनसठ',
  'साठ',
  'इकसठ',
  'बासठ',
  'तिरेसठ',
  'चौंसठ',
  'पैंसठ',
  'छियासठ',
  'सड़सठ',
  'अड़सठ',
  'उनहत्तर',
  'सत्तर',
  'इकहत्तर',
  'बहत्तर',
  'तिहत्तर',
  'चौहत्तर',
  'पचहत्तर',
  'छिहत्तर',
  'सतहत्तर',
  'अठहत्तर',
  'उन्यासी',
  'अस्सी',
  'इक्यासी',
  'बयासी',
  'तिरासी',
  'चौरासी',
  'पचासी',
  'छियासी',
  'सत्तासी',
  'अट्ठासी',
  'नवासी',
  'नब्बे',
];

export function hindiWord(n: number): string {
  return HI[n] ?? String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function numberWord(n: number, language: VoiceLanguage): string {
  return language === 'hi' ? hindiWord(n) : englishWord(n);
}

/**
 * The caller's line for a number, optionally led by its traditional rhyme:
 * "Two little ducks. Two and two, twenty-two."
 */
export function announcement(n: number, language: VoiceLanguage, rhyme?: string): string {
  const word = numberWord(n, language);
  let line: string;
  if (n < 10) {
    line = language === 'hi' ? `${word} नंबर` : `Number ${word}`;
  } else {
    const a = Math.floor(n / 10);
    const b = n % 10;
    line =
      language === 'hi'
        ? `${hindiWord(a)} ${hindiWord(b)}, ${word}`
        : `${capitalize(englishWord(a))} and ${englishWord(b)}, ${word}`;
  }
  return rhyme ? `${rhyme}. ${line}.` : `${line}.`;
}
