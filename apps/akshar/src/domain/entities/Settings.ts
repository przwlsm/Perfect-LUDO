import type { PenId, SurfaceId } from './Cosmetics';
import { PENS, SURFACES } from './Cosmetics';
import type { ScriptId } from './Script';
import { isScriptId } from './scripts';

/** Paper is the light desk, Slate the dark one; System follows the device. */
export type ThemeChoice = 'system' | 'paper' | 'slate';
export type Handedness = 'right' | 'left';
export type PenSize = 'fine' | 'medium' | 'bold';
export type Goal = 'signs' | 'child' | 'curious';

export interface Settings {
  readonly sound: boolean;
  readonly haptics: boolean;
  readonly theme: ThemeChoice;
  /** Calmer motion; null follows the OS until changed. */
  readonly reduceMotion: boolean | null;
  readonly handedness: Handedness;
  readonly penSize: PenSize;
  readonly pen: PenId;
  readonly surface: SurfaceId;
  /** The scripts the learner is learning, in the order they picked them. */
  readonly scripts: readonly ScriptId[];
  readonly goal: Goal | null;
  readonly onboarded: boolean;
  /** One-line first-time hints already shown. */
  readonly tipsSeen: readonly string[];
  readonly reviewAsked: boolean;
  /** Language override; null follows the device. */
  readonly language: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  theme: 'system',
  reduceMotion: null,
  handedness: 'right',
  penSize: 'medium',
  pen: 'ink',
  surface: 'desk',
  scripts: [],
  goal: null,
  onboarded: false,
  tipsSeen: [],
  reviewAsked: false,
  language: null,
};

/** Pen width in px at each thickness, for a writing box `box` px wide. */
export function penWidthFor(size: PenSize, box: number): number {
  const factor = size === 'fine' ? 0.034 : size === 'bold' ? 0.062 : 0.047;
  return Math.max(6, box * factor);
}

const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;

export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    const d = DEFAULT_SETTINGS;
    const scripts = Array.isArray(v.scripts) ? v.scripts.filter(isScriptId) : [];
    return {
      sound: typeof v.sound === 'boolean' ? v.sound : d.sound,
      haptics: typeof v.haptics === 'boolean' ? v.haptics : d.haptics,
      theme: oneOf(v.theme, ['system', 'paper', 'slate'] as const, d.theme),
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : null,
      handedness: oneOf(v.handedness, ['right', 'left'] as const, d.handedness),
      penSize: oneOf(v.penSize, ['fine', 'medium', 'bold'] as const, d.penSize),
      pen: oneOf(
        v.pen,
        PENS.map((p) => p.id),
        d.pen,
      ),
      surface: oneOf(
        v.surface,
        SURFACES.map((s) => s.id),
        d.surface,
      ),
      scripts: [...new Set(scripts)],
      goal: v.goal === 'signs' || v.goal === 'child' || v.goal === 'curious' ? v.goal : null,
      onboarded: v.onboarded === true && scripts.length > 0,
      tipsSeen: Array.isArray(v.tipsSeen)
        ? v.tipsSeen.filter((x): x is string => typeof x === 'string')
        : [],
      reviewAsked: v.reviewAsked === true,
      language: typeof v.language === 'string' ? v.language : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
