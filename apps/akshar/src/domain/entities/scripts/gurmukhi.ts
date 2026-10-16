import { letter as L, type Script } from '../Script';

/**
 * Gurmukhi for Punjabi: the independent vowels, then the paintī consonants
 * in their traditional order (ਸ ਹ first). The dotted letters (ਸ਼ ਜ਼ ਫ਼…)
 * come later. ਙ and ਞ have no everyday words, so their names are given.
 */
export const GURMUKHI: Script = {
  id: 'gurmukhi',
  native: 'ਗੁਰਮੁਖੀ',
  voices: ['pa-IN', 'pa-Guru-IN'],
  font: 'BalooPaaji2',
  praise: ['ਸ਼ਾਬਾਸ਼', 'shābāsh'],
  rtl: false,
  block: [0x0a00, 0x0a7f],
  groups: [
    {
      id: 'vowels',
      letters: [
        L('ਅ', 'a', 'ਅਨਾਰ', 'anār', 'pomegranate'),
        L('ਆ', 'ā', 'ਆਲੂ', 'ālū', 'potato'),
        L('ਇ', 'i', 'ਇੱਟ', 'iṭṭ', 'brick'),
        L('ਈ', 'ī', 'ਈਦ', 'īd', 'eid'),
        L('ਉ', 'u', 'ਉੱਲੂ', 'ullū', 'owl'),
        L('ਊ', 'ū', 'ਊਠ', 'ūṭh', 'camel'),
        L('ਏ', 'e', 'ਏਕਤਾ', 'ektā', 'unity'),
        L('ਐ', 'ai', 'ਐਨਕ', 'ainak', 'spectacles'),
        L('ਓ', 'o', 'ਓਸ', 'os', 'dew'),
        L('ਔ', 'au', 'ਔਰਤ', 'aurat', 'woman'),
      ],
    },
    {
      id: 'consonants',
      letters: [
        L('ਸ', 'sa', 'ਸੇਬ', 'seb', 'apple'),
        L('ਹ', 'ha', 'ਹਾਥੀ', 'hāthī', 'elephant'),
        L('ਕ', 'ka', 'ਕਬੂਤਰ', 'kabūtar', 'pigeon'),
        L('ਖ', 'kha', 'ਖਰਗੋਸ਼', 'khargoś', 'rabbit'),
        L('ਗ', 'ga', 'ਗਮਲਾ', 'gamlā', 'flowerpot'),
        L('ਘ', 'gha', 'ਘਰ', 'ghar', 'house'),
        L('ਙ', 'ṅa', 'ਙੰਙਾ', 'ṅaṅṅā', 'letterName'),
        L('ਚ', 'ca', 'ਚਮਚਾ', 'camcā', 'spoon'),
        L('ਛ', 'cha', 'ਛਤਰੀ', 'chatrī', 'umbrella'),
        L('ਜ', 'ja', 'ਜਹਾਜ਼', 'jahāz', 'ship'),
        L('ਝ', 'jha', 'ਝੰਡਾ', 'jhaṇḍā', 'flag'),
        L('ਞ', 'ña', 'ਞੰਞਾ', 'ñaññā', 'letterName'),
        L('ਟ', 'ṭa', 'ਟਮਾਟਰ', 'ṭamāṭar', 'tomato'),
        L('ਠ', 'ṭha', 'ਠੇਲਾ', 'ṭhelā', 'cart'),
        L('ਡ', 'ḍa', 'ਡੱਬਾ', 'ḍabbā', 'box'),
        L('ਢ', 'ḍha', 'ਢੋਲ', 'ḍhol', 'drum'),
        L('ਣ', 'ṇa', 'ਰਾਣੀ', 'rāṇī', 'queen'),
        L('ਤ', 'ta', 'ਤੋਤਾ', 'totā', 'parrot'),
        L('ਥ', 'tha', 'ਥਾਲੀ', 'thālī', 'plate'),
        L('ਦ', 'da', 'ਦਵਾਤ', 'davāt', 'inkpot'),
        L('ਧ', 'dha', 'ਧਨੁਸ਼', 'dhanuś', 'bow'),
        L('ਨ', 'na', 'ਨਲਕਾ', 'nalkā', 'handPump'),
        L('ਪ', 'pa', 'ਪਤੰਗ', 'pataṅg', 'kite'),
        L('ਫ', 'pha', 'ਫੁੱਲ', 'phull', 'flower'),
        L('ਬ', 'ba', 'ਬੱਤਖ', 'battakh', 'duck'),
        L('ਭ', 'bha', 'ਭਾਲੂ', 'bhālū', 'bear'),
        L('ਮ', 'ma', 'ਮੱਛੀ', 'macchī', 'fish'),
        L('ਯ', 'ya', 'ਯਾਰ', 'yār', 'friend'),
        L('ਰ', 'ra', 'ਰੱਥ', 'ratth', 'chariot'),
        L('ਲ', 'la', 'ਲੱਡੂ', 'laḍḍū', 'laddoo'),
        L('ਵ', 'va', 'ਵਾਜਾ', 'vājā', 'harmonium'),
        L('ੜ', 'ṛa', 'ਪਹਾੜ', 'pahāṛ', 'mountain'),
      ],
    },
  ],
};
