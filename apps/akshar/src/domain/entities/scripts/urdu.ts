import { letter as L, type Script } from '../Script';

/**
 * Urdu in the Arabic script (Nastaliq is the usual book hand; Akshar
 * teaches the isolated Naskh-style letter shapes, which are easier to
 * trace). The letters are named the way Urdu primers name them; the
 * sound is shown beside the name. A test makes sure the look-alike
 * Arabic letters (ك ي ه) never slip in for Urdu's ک ی ہ.
 */
export const URDU: Script = {
  id: 'urdu',
  native: 'اردو',
  voices: ['ur-PK', 'ur-IN'],
  font: 'BalooBhaijaan2',
  praise: ['شاباش', 'shābāsh'],
  rtl: true,
  block: [0x0600, 0x06ff],
  groups: [
    {
      id: 'letters',
      letters: [
        L('ا', 'alif', 'انار', 'anār', 'pomegranate', 'a'),
        L('ب', 'be', 'بلی', 'billī', 'cat', 'b'),
        L('پ', 'pe', 'پتنگ', 'patang', 'kite', 'p'),
        L('ت', 'te', 'تتلی', 'titlī', 'butterfly', 't'),
        L('ٹ', 'ṭe', 'ٹماٹر', 'ṭamāṭar', 'tomato', 'ṭ'),
        L('ث', 'se', 'ثمر', 'samar', 'fruit', 's'),
        L('ج', 'jīm', 'جہاز', 'jahāz', 'ship', 'j'),
        L('چ', 'che', 'چاند', 'chānd', 'moon', 'ch'),
        L('ح', 'baṛī he', 'حلوہ', 'halvā', 'halwa', 'h'),
        L('خ', 'khe', 'خرگوش', 'khargosh', 'rabbit', 'kh'),
        L('د', 'dāl', 'دروازہ', 'darvāza', 'door', 'd'),
        L('ڈ', 'ḍāl', 'ڈبہ', 'ḍabba', 'box', 'ḍ'),
        L('ذ', 'zāl', 'ذائقہ', 'zā’iqa', 'taste', 'z'),
        L('ر', 're', 'رات', 'rāt', 'night', 'r'),
        L('ڑ', 'ṛe', 'پہاڑ', 'pahāṛ', 'mountain', 'ṛ'),
        L('ز', 'ze', 'زمین', 'zamīn', 'earth', 'z'),
        L('ژ', 'zhe', 'ژالہ', 'zhāla', 'hail', 'zh'),
        L('س', 'sīn', 'سیب', 'seb', 'apple', 's'),
        L('ش', 'shīn', 'شیر', 'sher', 'lion', 'sh'),
        L('ص', 'su’ād', 'صابن', 'sābun', 'soap', 's'),
        L('ض', 'zu’ād', 'ضیا', 'ziyā', 'light', 'z'),
        L('ط', 'to’e', 'طوطا', 'totā', 'parrot', 't'),
        L('ظ', 'zo’e', 'ظرف', 'zarf', 'vessel', 'z'),
        L('ع', 'ain', 'عینک', 'ainak', 'spectacles', '’'),
        L('غ', 'ghain', 'غبارہ', 'ghubāra', 'balloon', 'gh'),
        L('ف', 'fe', 'فاختہ', 'fākhta', 'dove', 'f'),
        L('ق', 'qāf', 'قلم', 'qalam', 'pen', 'q'),
        L('ک', 'kāf', 'کتاب', 'kitāb', 'book', 'k'),
        L('گ', 'gāf', 'گاجر', 'gājar', 'carrot', 'g'),
        L('ل', 'lām', 'لڈو', 'laḍḍū', 'laddoo', 'l'),
        L('م', 'mīm', 'مچھلی', 'machhlī', 'fish', 'm'),
        L('ن', 'nūn', 'ناک', 'nāk', 'nose', 'n'),
        L('ں', 'nūn ghunna', 'ماں', 'mā̃', 'mother', 'ñ'),
        L('و', 'vā’o', 'ورق', 'varaq', 'page', 'v'),
        L('ہ', 'choṭī he', 'ہاتھی', 'hāthī', 'elephant', 'h'),
        L('ھ', 'do-chashmī he', 'بھالو', 'bhālū', 'bear', 'h'),
        L('ء', 'hamza', 'ابتداء', 'ibtidā’', 'beginning', '’'),
        L('ی', 'choṭī ye', 'یار', 'yār', 'friend', 'y'),
        L('ے', 'baṛī ye', 'بچے', 'bachche', 'children', 'e'),
      ],
    },
  ],
};
