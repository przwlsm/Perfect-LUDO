/**
 * Speak Local's learning content, as plain data.
 *
 * A scene is written once as a language-independent template (who speaks,
 * what each line means in English and in Hindi), and each language pack
 * gives every line its native text and an easy romanisation. Tests check
 * that every pack covers every line of every scene.
 */

/** The seven spoken languages of v1. */
export type LangId = 'kn' | 'ta' | 'te' | 'mr' | 'bn' | 'ml' | 'hi';

export type CityId =
  'bengaluru' | 'chennai' | 'hyderabad' | 'pune' | 'mumbai' | 'kolkata' | 'kochi' | 'delhi';

/** Who says a line. `you` is always the learner. */
export type Role =
  | 'you'
  | 'friend'
  | 'driver'
  | 'vendor'
  | 'owner'
  | 'colleague'
  | 'neighbour'
  | 'passerby'
  | 'waiter'
  | 'doctor'
  | 'chemist'
  | 'rider'
  | 'teacher'
  | 'parent'
  | 'clerk';

/** Where register matters: polite (elders, officials) or casual (friends, peers). */
export type Register = 'polite' | 'casual';

/** Free forever (`core`) or one of the bonus packs (Plus, or a day with a video). */
export type PackId = 'core' | 'festivals' | 'cricketMovies' | 'school' | 'bankGov' | 'friends';

export type SceneId =
  | 'greetings'
  | 'numbers'
  | 'auto'
  | 'shopping'
  | 'landlord'
  | 'office'
  | 'neighbours'
  | 'directions'
  | 'restaurant'
  | 'doctor'
  | 'emergency'
  | 'delivery'
  | 'festival'
  | 'wedding'
  | 'cricket'
  | 'movies'
  | 'teacher'
  | 'parents'
  | 'bank'
  | 'govtOffice'
  | 'newFriends'
  | 'weekend';

/** One line of a scene, before it is put into a language. */
export interface LineTemplate {
  /** Unique across all scenes: `<scene>.<n>` for dialogue, `<scene>.x<n>` for extra phrases. */
  readonly id: string;
  readonly speaker: Role;
  /** What it means, in plain English. */
  readonly en: string;
  /** The same meaning in Hindi (Devanagari), for Hindi-speaking learners. */
  readonly hi: string;
  readonly register?: Register;
}

export interface SceneTemplate {
  readonly id: SceneId;
  readonly pack: PackId;
  /** Ionicons glyph name for the scene card. */
  readonly icon: string;
  /** The dialogue, in order (4 to 8 lines). */
  readonly lines: readonly LineTemplate[];
  /** Useful phrases around the scene that are not in the dialogue (said by you). */
  readonly extras: readonly LineTemplate[];
}

/** Optional extras for one line in one language. */
export interface EntryExtra {
  /** A tiny culture or usage note, in English ("Add 'saar' to be polite"). */
  readonly note?: string;
  /** Replaces the template's English meaning where the language says something local (dishes, festivals). */
  readonly en?: string;
  /** Replaces the template's Hindi meaning, to match `en`. */
  readonly hi?: string;
}

/** [native script, romanisation] or [native script, romanisation, extras]. */
export type Entry = readonly [string, string] | readonly [string, string, EntryExtra];

export interface LanguagePack {
  readonly lang: LangId;
  /** Line id → entry. Must cover every line of every scene. */
  readonly lines: Readonly<Record<string, Entry>>;
}

/** A line ready to show and speak. */
export interface Phrase {
  /** `<lang>:<line id>`, stable across releases (progress and recordings key on it). */
  readonly key: string;
  readonly lang: LangId;
  readonly lineId: string;
  readonly scene: SceneId;
  readonly speaker: Role;
  readonly native: string;
  readonly roman: string;
  readonly en: string;
  readonly hi: string;
  readonly note?: string;
  readonly register?: Register;
  /** True for the scene's extra phrases (not part of the dialogue). */
  readonly extra: boolean;
  /**
   * A recorded voice for this line, when one ships. Resolved by key from the
   * audio registry; when absent the device's text-to-speech reads `native`.
   */
  readonly audio?: number;
}
