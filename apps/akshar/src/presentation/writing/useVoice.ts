import { useCallback, useEffect, useState } from 'react';
import type { Script } from '@/domain/entities/Script';
import { speech } from '@/config/container';

/**
 * The device voice for a script: `undefined` while asking, the language tag
 * to speak with, or null when this device has none.
 */
export function useVoice(script: Script) {
  const [voice, setVoice] = useState<{ id: string; lang: string | null } | null>(null);
  useEffect(() => {
    let live = true;
    void speech.voiceFor(script.voices).then((lang) => {
      if (live) setVoice({ id: script.id, lang });
    });
    return () => {
      live = false;
      speech.stop();
    };
  }, [script]);
  const lang = voice && voice.id === script.id ? voice.lang : undefined;
  const speak = useCallback(
    (text: string, slow = false) => {
      if (lang) speech.speak(text, lang, slow);
    },
    [lang],
  );
  return { lang, speak };
}
