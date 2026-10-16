import { CITIES, LANGUAGES } from '../content/languages';
import { BUBBLES, passId } from './Bubbles';
import { ALL_SKUS, PLUS_SKU } from './Products';
import {
  dayIndex,
  markPractised,
  markScene,
  NO_PROGRESS,
  parseProgress,
  sceneRecord,
  sceneStars,
  streak,
  toggleFavourite,
} from './Progress';
import {
  parseRecordingFileName,
  recordingFileName,
  takesToPrune,
  type Recording,
} from './Recording';
import { DEFAULT_SETTINGS, parseSettings } from './Settings';

const NOW = new Date(2026, 9, 16, 10);

describe('settings', () => {
  it('defaults to slow speech, English meanings only, no city yet', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.speed).toBe('slow');
    expect(DEFAULT_SETTINGS.hindiMeanings).toBe(false);
  });

  it('round-trips and drops anything malformed', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      city: 'chennai' as const,
      onboarded: true,
      voices: { ta: 'v1' },
    };
    expect(parseSettings(JSON.stringify(s))).toEqual(s);
    const bad = parseSettings(
      JSON.stringify({
        city: 'atlantis',
        onboarded: true,
        speed: 'warp',
        voices: { xx: 'v', kn: 3 },
      }),
    );
    expect(bad.city).toBeNull();
    expect(bad.onboarded).toBe(false);
    expect(bad.speed).toBe('slow');
    expect(bad.voices).toEqual({});
    expect(parseSettings('{not json')).toEqual(DEFAULT_SETTINGS);
  });
});

describe('progress', () => {
  it('records scenes, best quiz and practice days', () => {
    let p = markScene(NO_PROGRESS, 'kn', 'auto', { heard: true }, NOW);
    p = markScene(p, 'kn', 'auto', { quizBest: 80 }, NOW);
    p = markScene(p, 'kn', 'auto', { quizBest: 50 }, NOW);
    const r = sceneRecord(p, 'kn', 'auto');
    expect(r).toEqual({ heard: true, spoke: false, quizBest: 80 });
    expect(sceneStars(r)).toBe(2);
    expect(sceneRecord(p, 'ta', 'auto').heard).toBe(false);
    expect(p.days).toEqual(['2026-10-16']);
    expect(streak(p, NOW)).toBe(1);
  });

  it('keeps practised phrases and favourites as sets', () => {
    let p = markPractised(NO_PROGRESS, ['kn:auto.1', 'kn:auto.2'], NOW);
    p = markPractised(p, ['kn:auto.2', 'kn:auto.3'], NOW);
    expect(p.practised).toEqual(['kn:auto.1', 'kn:auto.2', 'kn:auto.3']);
    p = toggleFavourite(p, 'kn:auto.1');
    expect(p.favourites).toEqual(['kn:auto.1']);
    expect(toggleFavourite(p, 'kn:auto.1').favourites).toEqual([]);
  });

  it('survives a round trip and junk', () => {
    const p = markScene(
      toggleFavourite(NO_PROGRESS, 'kn:auto.1'),
      'kn',
      'auto',
      { spoke: true },
      NOW,
    );
    const withCard = {
      ...p,
      cards: { 'kn:auto.1': { ease: 2.5, interval: 1, due: 9, reps: 1, lapses: 0 } },
      lastScene: 'auto' as const,
    };
    expect(parseProgress(JSON.stringify(withCard))).toEqual(withCard);
    expect(parseProgress('nope')).toEqual(NO_PROGRESS);
    expect(
      parseProgress(JSON.stringify({ lastScene: 'moon', cards: { a: { ease: 9 } } })),
    ).toMatchObject({
      lastScene: null,
      cards: {},
    });
  });

  it('day indices count local days', () => {
    expect(dayIndex(new Date(2026, 9, 17, 0, 5)) - dayIndex(new Date(2026, 9, 16, 23, 55))).toBe(1);
  });
});

describe('recordings', () => {
  it('names files so their phrase and time can be read back', () => {
    const name = recordingFileName('kn:auto.x2', 1760000000000, 2345.6, '.m4a');
    expect(name).toBe('kn~auto.x2__1760000000000__2346.m4a');
    expect(parseRecordingFileName(name)).toEqual({
      id: name,
      phraseKey: 'kn:auto.x2',
      at: 1760000000000,
      durationMs: 2346,
    });
    expect(parseRecordingFileName('cache.tmp')).toBeNull();
  });

  it('prunes the oldest takes of one phrase beyond the limit', () => {
    const take = (key: string, at: number): Recording => ({
      id: `${key}${at}`,
      phraseKey: key,
      uri: '',
      at,
      durationMs: 1,
    });
    const all = [take('a', 1), take('a', 3), take('b', 2), take('a', 2)];
    expect(takesToPrune(all, 'a', 1).map((r) => r.at)).toEqual([2, 1]);
    expect(takesToPrune(all, 'a', 20)).toEqual([]);
  });
});

describe('catalogue metadata', () => {
  it('every city speaks a language we teach', () => {
    for (const c of CITIES) expect(LANGUAGES[c.lang]).toBeDefined();
  });

  it('sells Plus and five tips, and premium bubbles are passable', () => {
    expect(PLUS_SKU).toBe('speaklocal.plus');
    expect(ALL_SKUS).toHaveLength(6);
    expect(BUBBLES.filter((b) => !b.premium).map((b) => b.id)).toEqual(['classic']);
    expect(passId('pack', 'festivals')).toBe('pack:festivals');
  });
});
