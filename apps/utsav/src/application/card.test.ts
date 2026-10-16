import { NO_ENTITLEMENTS } from 'app-kit';
import {
  cardAsText,
  MAX_SAVED_CARDS,
  parseSavedCards,
  parseSpec,
  upsertCard,
  type CardSpec,
} from '@/domain/entities/Card';
import { cardLanguageFor } from '@/domain/entities/Language';
import { DEFAULT_SETTINGS, parseSettings } from '@/domain/entities/Settings';
import {
  effectiveType,
  exportPlan,
  newCard,
  paletteIndex,
  templateOpen,
  typeStylesFor,
  withLanguage,
  withTemplate,
} from './card';
import { templateById, templatesFor } from './catalogue/templates';
import { MESSAGES } from './messages';
import { searchOccasions } from './search';

const diyas = templateById('diwali.diyas')!;
const rangoli = templateById('diwali.rangoli')!;
const cake = templateById('birthday.cake')!;

describe('cards', () => {
  it('start from the template with suggested words and the sender name', () => {
    const spec = newCard(diyas, 'hi', 'Asha');
    expect(spec.templateId).toBe('diwali.diyas');
    expect(spec.occasion).toBe('diwali');
    expect(spec.from).toBe('Asha');
    expect(MESSAGES.hi.occasions.diwali.headlines).toContain(spec.headline);
    expect(spec.format).toBe('square');
    expect(spec.photo).toBeNull();
  });

  it('keep the words when moving within an occasion, and replace them across occasions', () => {
    const mine = { ...newCard(diyas, 'en', ''), message: 'My own words', palette: 2 };
    const same = withTemplate(mine, rangoli);
    expect(same.message).toBe('My own words');
    expect(same.palette).toBe(0);
    const other = withTemplate(mine, cake);
    expect(other.occasion).toBe('birthday');
    expect(MESSAGES.en.occasions.birthday.messages).toContain(other.message);
  });

  it('translate suggestions when the language changes, but keep typed words', () => {
    const spec = newCard(diyas, 'en', '', 1);
    const hindi = withLanguage(spec, 'hi');
    expect(hindi.headline).toBe(MESSAGES.hi.occasions.diwali.headlines[0]);
    expect(hindi.message).toBe(MESSAGES.hi.occasions.diwali.messages[1]);
    const typed = withLanguage({ ...spec, message: 'Love from all of us' }, 'ta');
    expect(typed.message).toBe('Love from all of us');
    expect(typed.language).toBe('ta');
    expect(withLanguage(spec, 'en')).toBe(spec);
  });

  it('maps a suggestion beyond the target list to its last line', () => {
    const spec = {
      ...newCard(diyas, 'en', ''),
      message: MESSAGES.en.occasions.diwali.messages[3]!,
    };
    const tamil = withLanguage(spec, 'ta');
    const list = MESSAGES.ta.occasions.diwali.messages;
    expect(tamil.message).toBe(list[list.length - 1]);
  });

  it('wrap palette indexes', () => {
    expect(paletteIndex(diyas, 3)).toBe(0);
    expect(paletteIndex(diyas, -1)).toBe(diyas.palettes.length - 1);
  });

  it('offer lettering only where it differs', () => {
    expect(typeStylesFor('en')).toHaveLength(5);
    expect(typeStylesFor('hi')).toEqual(['festive', 'hand', 'round']);
    expect(typeStylesFor('ta')).toEqual([]);
    const spec = { ...newCard(diyas, 'en', ''), type: 'script' as const };
    expect(effectiveType(spec, diyas, true)).toBe('script');
    expect(effectiveType(spec, diyas, false)).toBe(diyas.type);
  });

  it('export square with a mark for everyone, HD and status without it for Plus', () => {
    expect(exportPlan('story', false)).toEqual({
      format: 'square',
      width: 720,
      height: 720,
      watermark: true,
    });
    expect(exportPlan('square', true)).toMatchObject({
      width: 1080,
      height: 1080,
      watermark: false,
    });
    expect(exportPlan('story', true)).toMatchObject({ width: 1080, height: 1920, format: 'story' });
  });

  it('open premium templates with Plus or a day pass', () => {
    const premium = templatesFor('diwali').find((t) => t.premium)!;
    const now = 1_000_000;
    expect(templateOpen(NO_ENTITLEMENTS, diyas, now)).toBe(true);
    expect(templateOpen(NO_ENTITLEMENTS, premium, now)).toBe(false);
    expect(templateOpen({ ...NO_ENTITLEMENTS, plus: true }, premium, now)).toBe(true);
    const pass = { ...NO_ENTITLEMENTS, passes: { [premium.id]: now + 1 } };
    expect(templateOpen(pass, premium, now)).toBe(true);
    expect(templateOpen(pass, premium, now + 2)).toBe(false);
  });
});

describe('stored cards', () => {
  const spec: CardSpec = {
    ...newCard(diyas, 'en', 'Ravi'),
    photo: { uri: 'file:///p.jpg', shape: 'arch', zoom: 2, x: 0.3, y: -0.2 },
  };

  it('round-trip through JSON', () => {
    expect(parseSpec(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });

  it('repair or reject damaged specs', () => {
    expect(parseSpec(null)).toBeNull();
    expect(parseSpec({ ...spec, occasion: 'mars' })).toBeNull();
    expect(parseSpec({ ...spec, language: 'xx' })).toBeNull();
    const fixed = parseSpec({
      ...spec,
      palette: -4,
      format: 'poster',
      type: 'gothic',
      photo: { uri: 'a', zoom: 99, x: 7 },
      headline: 'x'.repeat(500),
    })!;
    expect(fixed.palette).toBe(0);
    expect(fixed.format).toBe('square');
    expect(fixed.type).toBeNull();
    expect(fixed.photo).toEqual({ uri: 'a', shape: 'circle', zoom: 4, x: 1, y: 0 });
    expect(fixed.headline.length).toBe(60);
  });

  it('keep the newest first, update in place and cap the list', () => {
    let cards = upsertCard([], 'a', spec, 1, false);
    cards = upsertCard(cards, 'b', spec, 2, true);
    cards = upsertCard(cards, 'a', { ...spec, message: 'new' }, 3, true);
    expect(cards.map((c) => c.id)).toEqual(['a', 'b']);
    expect(cards[0]!.createdAt).toBe(1);
    expect(cards[0]!.updatedAt).toBe(3);
    expect(cards[0]!.sent).toBe(true);
    expect(upsertCard(cards, 'b', spec, 4, false)[0]!.sent).toBe(true);
    for (let i = 0; i < MAX_SAVED_CARDS + 5; i++)
      cards = upsertCard(cards, `c${i}`, spec, 10 + i, false);
    expect(cards).toHaveLength(MAX_SAVED_CARDS);
    expect(cards[0]!.id).toBe(`c${MAX_SAVED_CARDS + 4}`);
  });

  it('parse a stored list and skip junk', () => {
    const raw = JSON.stringify([
      { id: 'a', createdAt: 5, sent: true, spec },
      { id: 'b', spec: { nope: 1 } },
      42,
    ]);
    const cards = parseSavedCards(raw);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ id: 'a', createdAt: 5, updatedAt: 5, sent: true });
    expect(parseSavedCards('not json')).toEqual([]);
    expect(parseSavedCards(null)).toEqual([]);
  });

  it('become plain text for pasting', () => {
    expect(cardAsText({ ...spec, headline: 'Hi', message: ' Msg ' }, 'With love, Ravi')).toBe(
      'Hi\n\nMsg\n\nWith love, Ravi',
    );
    expect(cardAsText({ ...spec, headline: 'Hi', message: '' }, '')).toBe('Hi');
  });
});

describe('settings and language', () => {
  it('parse safely', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{')).toEqual(DEFAULT_SETTINGS);
    const s = parseSettings(
      JSON.stringify({
        name: 'Meera',
        cardLanguage: 'bn',
        theme: 'night',
        shares: -2,
        sound: false,
      }),
    );
    expect(s).toMatchObject({
      name: 'Meera',
      cardLanguage: 'bn',
      theme: 'night',
      shares: 0,
      sound: false,
    });
    expect(parseSettings(JSON.stringify({ cardLanguage: 'zz', theme: 'blue' }))).toMatchObject({
      cardLanguage: null,
      theme: 'system',
    });
  });

  it('pick a card language from the device', () => {
    expect(cardLanguageFor('hi-IN')).toBe('hi');
    expect(cardLanguageFor('ta')).toBe('ta');
    expect(cardLanguageFor('fr-FR')).toBe('en');
    expect(cardLanguageFor(null)).toBe('en');
  });
});

describe('search', () => {
  const names = {
    diwali: 'Diwali',
    holi: 'Holi',
    eid: 'Eid',
    christmas: 'Christmas',
    newYear: 'New Year',
    pongal: 'Pongal & Sankranti',
    rakhi: 'Raksha Bandhan',
    ganesh: 'Ganesh Chaturthi',
    navratri: 'Navratri & Durga Puja',
    onam: 'Onam',
    gurpurab: 'Gurpurab',
    birthday: 'Birthday',
    anniversary: 'Anniversary',
    goodMorning: 'Good morning',
    goodNight: 'Good night',
    thankYou: 'Thank you',
    congrats: 'Congratulations',
    getWell: 'Get well soon',
  } as const;

  it('finds by name, alias, native script and part of a word', () => {
    expect(searchOccasions('diwali', names)[0]).toBe('diwali');
    expect(searchOccasions('Deepavali', names)[0]).toBe('diwali');
    expect(searchOccasions('दिवाली', names)[0]).toBe('diwali');
    expect(searchOccasions('bday', names)[0]).toBe('birthday');
    expect(searchOccasions('xmas', names)[0]).toBe('christmas');
    expect(searchOccasions('puja', names)).toContain('navratri');
    expect(searchOccasions('good', names).slice(0, 2).sort()).toEqual(['goodMorning', 'goodNight']);
    expect(searchOccasions('rakhi', names)[0]).toBe('rakhi');
    expect(searchOccasions('பொங்கல்', names)[0]).toBe('pongal');
  });

  it('matches nothing for empty or unknown queries', () => {
    expect(searchOccasions('   ', names)).toEqual([]);
    expect(searchOccasions('zzzz', names)).toEqual([]);
  });
});
