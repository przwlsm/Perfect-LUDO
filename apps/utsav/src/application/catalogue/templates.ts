import { OCCASION_IDS, type OccasionId } from '@/domain/entities/Occasion';
import type { DesignId, FxKind, LayoutKind, Template, TypeStyle } from '@/domain/entities/Template';
import { PALETTES, type PaletteId } from './palettes';

const t = (
  occasion: OccasionId,
  design: DesignId,
  layout: LayoutKind,
  type: TypeStyle,
  fx: FxKind,
  premium: boolean,
  palettes: PaletteId[],
): Template => ({
  id: `${occasion}.${design}`,
  occasion,
  design,
  layout,
  type,
  fx,
  premium,
  palettes: palettes.map((id) => PALETTES[id]),
});

const FREE = false;
const PLUS = true;

/**
 * Every template, grouped by occasion in gallery order. Each occasion has
 * at least three free designs; premium ones open with Plus or for a day
 * after a rewarded video.
 */
export const TEMPLATES: readonly Template[] = [
  t('diwali', 'diyas', 'upper', 'festive', 'flicker', FREE, ['maroon', 'midnight', 'aubergine']),
  t('diwali', 'rangoli', 'lower', 'festive', 'twinkle', FREE, ['ivory', 'aubergine', 'blushIvory']),
  t('diwali', 'fireworks', 'lower', 'elegant', 'fireworks', FREE, [
    'midnight',
    'maroon',
    'peacock',
  ]),
  t('diwali', 'toran', 'center', 'festive', 'twinkle', PLUS, ['ivory', 'maroon', 'blushIvory']),
  t('diwali', 'lanterns', 'lower', 'elegant', 'flicker', PLUS, [
    'aubergine',
    'midnight',
    'magentaNight',
  ]),

  t('holi', 'gulal', 'center', 'festive', 'petals', FREE, ['holi', 'holiSun']),
  t('holi', 'splash', 'center', 'round', 'confetti', FREE, ['holiSun', 'holi']),
  t('holi', 'rangoli', 'lower', 'festive', 'twinkle', FREE, ['holi', 'candy']),
  t('holi', 'florals', 'center', 'script', 'petals', PLUS, ['holi', 'blushIvory']),
  t('holi', 'confetti', 'center', 'round', 'confetti', PLUS, ['partyNight', 'holi']),

  t('eid', 'crescent', 'lower', 'elegant', 'twinkle', FREE, ['emerald', 'midnight', 'teal']),
  t('eid', 'jaali', 'arch', 'elegant', 'twinkle', FREE, ['emerald', 'ivory', 'teal']),
  t('eid', 'lanterns', 'lower', 'elegant', 'flicker', FREE, ['teal', 'emerald', 'aubergine']),
  t('eid', 'paperArch', 'arch', 'elegant', 'twinkle', PLUS, ['mint', 'emerald', 'ivory']),
  t('eid', 'moonlit', 'lower', 'script', 'twinkle', PLUS, ['starNight', 'emerald']),

  t('christmas', 'tree', 'lower', 'elegant', 'snow', FREE, ['pine', 'hollyRed', 'midnight']),
  t('christmas', 'fairyLights', 'center', 'script', 'twinkle', FREE, ['hollyRed', 'pine', 'snow']),
  t('christmas', 'baubles', 'lower', 'elegant', 'snow', FREE, ['snow', 'hollyRed', 'pine']),
  t('christmas', 'wreath', 'ring', 'script', 'snow', PLUS, ['snow', 'pine', 'hollyRed']),
  t('christmas', 'bokeh', 'center', 'elegant', 'snow', PLUS, ['midnight', 'hollyRed']),

  t('newYear', 'fireworks', 'lower', 'elegant', 'fireworks', FREE, [
    'champagne',
    'midnight',
    'partyNight',
  ]),
  t('newYear', 'confetti', 'center', 'festive', 'confetti', FREE, [
    'champagne',
    'candy',
    'partyNight',
  ]),
  t('newYear', 'bokeh', 'center', 'script', 'bokeh', FREE, ['champagne', 'lavenderNight', 'wine']),
  t('newYear', 'fairyLights', 'center', 'elegant', 'twinkle', PLUS, ['midnight', 'champagne']),
  t('newYear', 'baubles', 'lower', 'elegant', 'twinkle', PLUS, ['champagne', 'partyNight']),

  t('pongal', 'pongalPot', 'upper', 'festive', 'twinkle', FREE, ['pongal', 'ivory']),
  t('pongal', 'kolam', 'center', 'festive', 'twinkle', FREE, ['pongal', 'maroon', 'kasavu']),
  t('pongal', 'kites', 'lower', 'round', 'petals', FREE, ['sky', 'sunrise']),
  t('pongal', 'rays', 'lower', 'festive', 'twinkle', PLUS, ['sunrise', 'pongal']),
  t('pongal', 'toran', 'center', 'festive', 'twinkle', PLUS, ['pongal', 'ivory']),

  t('rakhi', 'rakhi', 'lower', 'festive', 'twinkle', FREE, ['blushIvory', 'maroon', 'ivory']),
  t('rakhi', 'florals', 'center', 'script', 'petals', FREE, ['blushIvory', 'dawnPink']),
  t('rakhi', 'paperArch', 'arch', 'festive', 'twinkle', FREE, ['ivory', 'maroon', 'blushIvory']),
  t('rakhi', 'hearts', 'center', 'hand', 'petals', PLUS, ['blush', 'wine']),
  t('rakhi', 'toran', 'center', 'festive', 'twinkle', PLUS, ['blushIvory', 'ivory']),

  t('ganesh', 'modak', 'upper', 'festive', 'twinkle', FREE, ['ivory', 'maroon', 'kesariIvory']),
  t('ganesh', 'toran', 'center', 'festive', 'twinkle', FREE, ['ivory', 'maroon']),
  t('ganesh', 'lotus', 'upper', 'festive', 'petals', FREE, ['blushIvory', 'aubergine']),
  t('ganesh', 'rangoli', 'lower', 'festive', 'twinkle', PLUS, ['maroon', 'ivory']),
  t('ganesh', 'diyas', 'upper', 'festive', 'flicker', PLUS, ['maroon', 'aubergine']),

  t('navratri', 'dandiya', 'center', 'festive', 'twinkle', FREE, [
    'magentaNight',
    'peacock',
    'ivory',
  ]),
  t('navratri', 'alpona', 'center', 'festive', 'twinkle', FREE, ['pujaRed', 'ivory']),
  t('navratri', 'rangoli', 'lower', 'festive', 'twinkle', FREE, [
    'magentaNight',
    'ivory',
    'peacock',
  ]),
  t('navratri', 'toran', 'center', 'festive', 'twinkle', PLUS, ['ivory', 'pujaRed']),
  t('navratri', 'diyas', 'upper', 'festive', 'flicker', PLUS, ['pujaRed', 'maroon']),

  t('onam', 'pookalam', 'lower', 'festive', 'petals', FREE, ['kasavu', 'pongal']),
  t('onam', 'kasavu', 'center', 'elegant', 'twinkle', FREE, ['kasavu', 'ivory']),
  t('onam', 'florals', 'center', 'festive', 'petals', FREE, ['kasavu', 'mint']),
  t('onam', 'toran', 'center', 'festive', 'twinkle', PLUS, ['kasavu', 'ivory']),
  t('onam', 'diyas', 'upper', 'festive', 'flicker', PLUS, ['maroon', 'kasavu']),

  t('gurpurab', 'diyas', 'upper', 'festive', 'flicker', FREE, ['kesariNight', 'maroon']),
  t('gurpurab', 'rays', 'lower', 'elegant', 'twinkle', FREE, ['kesariIvory', 'sunrise']),
  t('gurpurab', 'lanterns', 'lower', 'elegant', 'flicker', FREE, ['kesariNight', 'midnight']),
  t('gurpurab', 'fireworks', 'lower', 'elegant', 'fireworks', PLUS, ['kesariNight', 'midnight']),
  t('gurpurab', 'paperArch', 'arch', 'festive', 'twinkle', PLUS, ['kesariIvory', 'ivory']),

  t('birthday', 'balloons', 'lower', 'script', 'confetti', FREE, ['candy', 'partyNight', 'sky']),
  t('birthday', 'cake', 'upper', 'script', 'flicker', FREE, ['candy', 'partyNight', 'blush']),
  t('birthday', 'confetti', 'center', 'round', 'confetti', FREE, [
    'partyNight',
    'candy',
    'holiSun',
  ]),
  t('birthday', 'florals', 'center', 'script', 'petals', PLUS, ['blushIvory', 'mint', 'roseGold']),
  t('birthday', 'fairyLights', 'center', 'script', 'twinkle', PLUS, ['partyNight', 'midnight']),

  t('anniversary', 'hearts', 'center', 'script', 'petals', FREE, ['blush', 'wine', 'roseGold']),
  t('anniversary', 'florals', 'center', 'script', 'petals', FREE, [
    'roseGold',
    'blushIvory',
    'wine',
  ]),
  t('anniversary', 'bokeh', 'center', 'script', 'bokeh', FREE, ['wine', 'champagne']),
  t('anniversary', 'paperArch', 'arch', 'elegant', 'twinkle', PLUS, ['roseGold', 'wine']),
  t('anniversary', 'fairyLights', 'center', 'script', 'twinkle', PLUS, ['wine', 'midnight']),

  t('goodMorning', 'sunrise', 'upper', 'round', 'petals', FREE, ['sunrise', 'dawnPink', 'sky']),
  t('goodMorning', 'chai', 'upper', 'hand', 'twinkle', FREE, ['sunrise', 'ivory', 'mint']),
  t('goodMorning', 'florals', 'center', 'script', 'petals', FREE, ['dawnPink', 'mint', 'sunrise']),
  t('goodMorning', 'lotus', 'upper', 'elegant', 'petals', PLUS, ['blushIvory', 'mint']),
  t('goodMorning', 'kolam', 'center', 'festive', 'twinkle', PLUS, ['sunrise', 'ivory']),

  t('goodNight', 'moonlit', 'lower', 'script', 'twinkle', FREE, [
    'starNight',
    'lavenderNight',
    'midnight',
  ]),
  t('goodNight', 'crescent', 'lower', 'elegant', 'twinkle', FREE, ['lavenderNight', 'starNight']),
  t('goodNight', 'bokeh', 'center', 'script', 'bokeh', FREE, ['starNight', 'lavenderNight']),
  t('goodNight', 'lotus', 'upper', 'elegant', 'twinkle', PLUS, ['starNight', 'lavenderNight']),
  t('goodNight', 'fairyLights', 'center', 'script', 'twinkle', PLUS, ['lavenderNight', 'midnight']),

  t('thankYou', 'florals', 'center', 'script', 'petals', FREE, ['sage', 'blushIvory', 'roseGold']),
  t('thankYou', 'paperArch', 'arch', 'elegant', 'twinkle', FREE, ['ivory', 'mint', 'blushIvory']),
  t('thankYou', 'hearts', 'center', 'hand', 'petals', FREE, ['blush', 'sage']),
  t('thankYou', 'bokeh', 'center', 'script', 'bokeh', PLUS, ['champagne', 'wine']),
  t('thankYou', 'toran', 'center', 'festive', 'twinkle', PLUS, ['ivory', 'kasavu']),

  t('congrats', 'confetti', 'center', 'festive', 'confetti', FREE, [
    'partyNight',
    'candy',
    'champagne',
  ]),
  t('congrats', 'balloons', 'lower', 'round', 'confetti', FREE, ['sky', 'candy']),
  t('congrats', 'bokeh', 'center', 'elegant', 'bokeh', FREE, ['champagne', 'peacock']),
  t('congrats', 'fireworks', 'lower', 'elegant', 'fireworks', PLUS, ['midnight', 'partyNight']),
  t('congrats', 'paperArch', 'arch', 'festive', 'twinkle', PLUS, ['ivory', 'mint']),

  t('getWell', 'florals', 'center', 'hand', 'petals', FREE, ['sage', 'sky', 'blushIvory']),
  t('getWell', 'sunrise', 'upper', 'round', 'petals', FREE, ['sky', 'sunrise']),
  t('getWell', 'lotus', 'upper', 'hand', 'petals', FREE, ['mint', 'blushIvory']),
  t('getWell', 'chai', 'upper', 'hand', 'twinkle', PLUS, ['sky', 'sunrise']),
  t('getWell', 'bokeh', 'center', 'hand', 'bokeh', PLUS, ['teal', 'lavenderNight']),
];

const BY_ID = new Map(TEMPLATES.map((tpl) => [tpl.id, tpl]));

export function templateById(id: string): Template | undefined {
  return BY_ID.get(id);
}

export function templatesFor(occasion: OccasionId): readonly Template[] {
  return TEMPLATES.filter((tpl) => tpl.occasion === occasion);
}

/** The occasion's first free template: its face on the home screen. */
export function heroTemplate(occasion: OccasionId): Template {
  const list = templatesFor(occasion);
  return list.find((tpl) => !tpl.premium) ?? list[0]!;
}

/**
 * The hand-curated "Popular now" row, by month (0 = January). Festivals are
 * listed in the months they usually fall in, without ever showing a date;
 * everyday occasions fill the rest. Edit freely: it is only an ordering.
 */
const SEASONS: Readonly<Record<number, readonly OccasionId[]>> = {
  0: ['pongal', 'newYear', 'goodMorning', 'birthday', 'thankYou'],
  1: ['goodMorning', 'anniversary', 'birthday', 'holi', 'congrats'],
  2: ['holi', 'eid', 'goodMorning', 'birthday', 'navratri'],
  3: ['eid', 'goodMorning', 'birthday', 'congrats', 'thankYou'],
  4: ['goodMorning', 'birthday', 'congrats', 'eid', 'anniversary'],
  5: ['eid', 'goodMorning', 'birthday', 'congrats', 'getWell'],
  6: ['goodMorning', 'birthday', 'rakhi', 'thankYou', 'goodNight'],
  7: ['rakhi', 'onam', 'ganesh', 'goodMorning', 'birthday'],
  8: ['ganesh', 'onam', 'navratri', 'goodMorning', 'birthday'],
  9: ['diwali', 'navratri', 'goodMorning', 'birthday', 'thankYou'],
  10: ['diwali', 'gurpurab', 'goodMorning', 'birthday', 'christmas'],
  11: ['christmas', 'newYear', 'goodMorning', 'birthday', 'thankYou'],
};

export function popularNow(now: Date): readonly OccasionId[] {
  return SEASONS[now.getMonth()] ?? SEASONS[0]!;
}

/** All occasions with this month's popular ones first, the rest in catalogue order. */
export function occasionsInOrder(now: Date): readonly OccasionId[] {
  const popular = popularNow(now);
  return [...popular, ...OCCASION_IDS.filter((id) => !popular.includes(id))];
}
