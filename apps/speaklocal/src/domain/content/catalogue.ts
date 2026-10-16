import { AUDIO } from './audio';
import { isLangId } from './languages';
import { PACKS_BY_LANG } from './packs';
import { SCENES, sceneById } from './scenes';
import type { LangId, LineTemplate, Phrase, SceneId } from './types';

export function phraseKey(lang: LangId, lineId: string): string {
  return `${lang}:${lineId}`;
}

function build(lang: LangId, scene: SceneId, t: LineTemplate, extra: boolean): Phrase | null {
  const entry = PACKS_BY_LANG[lang].lines[t.id];
  if (!entry) return null;
  const [native, roman, more] = entry;
  const key = phraseKey(lang, t.id);
  const audio = AUDIO[key];
  return {
    key,
    lang,
    lineId: t.id,
    scene,
    speaker: t.speaker,
    native,
    roman,
    en: more?.en ?? t.en,
    hi: more?.hi ?? t.hi,
    ...(more?.note ? { note: more.note } : {}),
    ...(t.register ? { register: t.register } : {}),
    extra,
    ...(audio !== undefined ? { audio } : {}),
  };
}

const cache = new Map<string, readonly Phrase[]>();

/** The dialogue of a scene in a language, in order. */
export function dialogue(lang: LangId, scene: SceneId): readonly Phrase[] {
  const k = `${lang}|${scene}|d`;
  let v = cache.get(k);
  if (!v) {
    v = sceneById(scene)
      .lines.map((t) => build(lang, scene, t, false))
      .filter((p): p is Phrase => p !== null);
    cache.set(k, v);
  }
  return v;
}

/** The scene's extra phrases (said by you, not in the dialogue). */
export function extras(lang: LangId, scene: SceneId): readonly Phrase[] {
  const k = `${lang}|${scene}|x`;
  let v = cache.get(k);
  if (!v) {
    v = sceneById(scene)
      .extras.map((t) => build(lang, scene, t, true))
      .filter((p): p is Phrase => p !== null);
    cache.set(k, v);
  }
  return v;
}

/** Everything a learner says in a scene: their dialogue lines, then the extras. */
export function yourPhrases(lang: LangId, scene: SceneId): readonly Phrase[] {
  return [...dialogue(lang, scene).filter((p) => p.speaker === 'you'), ...extras(lang, scene)];
}

/** Every phrase of a scene: dialogue then extras. */
export function scenePhrases(lang: LangId, scene: SceneId): readonly Phrase[] {
  return [...dialogue(lang, scene), ...extras(lang, scene)];
}

/** Every phrase in a language, scene by scene. */
export function allPhrases(lang: LangId, scenes: readonly SceneId[] = SCENES.map((s) => s.id)) {
  return scenes.flatMap((s) => scenePhrases(lang, s));
}

/** The phrase a stored key points at, or null when the content no longer has it. */
export function phraseByKey(key: string): Phrase | null {
  const [lang, lineId] = key.split(':');
  if (!isLangId(lang) || !lineId) return null;
  const sceneId = lineId.split('.')[0] as SceneId;
  if (!SCENES.some((s) => s.id === sceneId)) return null;
  return scenePhrases(lang, sceneId).find((p) => p.lineId === lineId) ?? null;
}
