import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { chooseVoice, voicesFor } from '@/application/voice/selectVoice';
import { LANGUAGES } from '@/domain/content/languages';
import type { LangId, Phrase } from '@/domain/content/types';
import { RATES } from '@/domain/entities/Settings';
import type { DeviceVoice } from '@/domain/ports';
import { clips, speech } from '@/config/container';
import { useSettings } from './SettingsProvider';

interface SayOptions {
  /** Overrides the learner's speed setting. */
  readonly slow?: boolean;
  readonly onEnd?: (finished: boolean) => void;
}

interface VoiceValue {
  /** Null until the device has answered. */
  readonly voices: readonly DeviceVoice[] | null;
  /** The voice that speaks a language: undefined while asking, null when the device has none. */
  voiceFor(lang: LangId): DeviceVoice | null | undefined;
  /** Every voice for a language, best first. */
  optionsFor(lang: LangId): DeviceVoice[];
  /** True when a phrase can be heard (a recorded line or a device voice). */
  canHear(p: Pick<Phrase, 'lang' | 'audio'>): boolean;
  /** The phrase being spoken right now, for highlighting. */
  readonly speaking: string | null;
  say(p: Phrase, options?: SayOptions): void;
  /** Speaks a sample with one particular voice (Settings preview). */
  preview(lang: LangId, voice: DeviceVoice, text: string): void;
  stop(): void;
}

const Ctx = createContext<VoiceValue | null>(null);

/**
 * The voice of the app. Recorded native lines play first where they exist;
 * otherwise the device's text-to-speech reads the native text with the
 * learner's chosen voice, or our default pick (a female voice where the
 * device lets us tell; see selectVoice.ts).
 */
export function VoiceProvider({ children }: PropsWithChildren) {
  const { settings } = useSettings();
  const [voices, setVoices] = useState<readonly DeviceVoice[] | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const token = useRef(0);

  useEffect(() => {
    let live = true;
    void speech.voices().then((v) => {
      if (live) setVoices(v);
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        speech.stop();
        clips.stop();
        return;
      }
      // Back from the phone's settings: a newly installed voice shows up at once.
      void speech.voices().then((v) => {
        if (live) setVoices(v);
      });
    });
    return () => {
      live = false;
      sub.remove();
    };
  }, []);

  const stop = useCallback(() => {
    token.current++;
    speech.stop();
    clips.stop();
    setSpeaking(null);
  }, []);

  const value = useMemo<VoiceValue>(() => {
    const voiceFor = (lang: LangId) =>
      voices === null
        ? undefined
        : chooseVoice(voices, LANGUAGES[lang].speech, settings.voices[lang]);
    return {
      voices,
      voiceFor,
      optionsFor: (lang) => (voices ? voicesFor(voices, LANGUAGES[lang].speech) : []),
      canHear: (p) => p.audio !== undefined || !!voiceFor(p.lang),
      speaking,
      say(p, options) {
        const mine = ++token.current;
        const done = (finished: boolean) => {
          if (token.current !== mine) return;
          setSpeaking(null);
          options?.onEnd?.(finished);
        };
        speech.stop();
        clips.stop();
        token.current = mine;
        setSpeaking(p.key);
        if (p.audio !== undefined) {
          clips.play(p.audio, () => done(true));
          return;
        }
        const voice = voiceFor(p.lang);
        if (!voice) {
          done(false);
          return;
        }
        const slow = options?.slow ?? settings.speed === 'slow';
        speech.speak(p.native, {
          language: LANGUAGES[p.lang].speech,
          voice: voice.id,
          rate: slow ? RATES.slow : RATES.normal,
          onEnd: done,
        });
      },
      preview(lang, voice, text) {
        token.current++;
        clips.stop();
        speech.speak(text, {
          language: LANGUAGES[lang].speech,
          voice: voice.id,
          rate: settings.speed === 'slow' ? RATES.slow : RATES.normal,
        });
      },
      stop,
    };
  }, [voices, speaking, settings.voices, settings.speed, stop]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVoice(): VoiceValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVoice must be used inside VoiceProvider');
  return v;
}
