import * as Speech from 'expo-speech';
import type { DeviceVoice, ISpeech, SpeakOptions } from '@/domain/ports';

/**
 * A browser with no voices at all never answers expo-speech's voice list
 * (it waits for a "voices changed" event that never comes), so give up
 * after a moment and treat it as none.
 */
function withTimeout(list: Promise<Speech.Voice[]>, ms = 2500): Promise<Speech.Voice[]> {
  return Promise.race([list, new Promise<Speech.Voice[]>((r) => setTimeout(() => r([]), ms))]);
}

/**
 * The device's own text-to-speech (no network, no recordings). The voice
 * list is read once; browsers fill theirs a moment after load, so an empty
 * first answer is asked again.
 */
export class ExpoSpeech implements ISpeech {
  private list: Promise<readonly DeviceVoice[]> | null = null;
  private current: ((finished: boolean) => void) | null = null;

  voices(): Promise<readonly DeviceVoice[]> {
    this.list ??= (async () => {
      try {
        let v = await withTimeout(Speech.getAvailableVoicesAsync());
        if (v.length === 0) {
          await new Promise((r) => setTimeout(r, 700));
          v = await withTimeout(Speech.getAvailableVoicesAsync());
        }
        if (v.length === 0) this.list = null;
        return v.map((x) => ({
          id: x.identifier,
          name: x.name,
          language: x.language,
          enhanced: x.quality === Speech.VoiceQuality.Enhanced,
        }));
      } catch {
        this.list = null;
        return [];
      }
    })();
    return this.list;
  }

  speak(text: string, options: SpeakOptions): void {
    this.endCurrent(false);
    let done = false;
    const end = (finished: boolean) => {
      if (done) return;
      done = true;
      if (this.current === end) this.current = null;
      options.onEnd?.(finished);
    };
    this.current = end;
    try {
      void Speech.stop();
      Speech.speak(text, {
        language: options.language,
        ...(options.voice ? { voice: options.voice } : {}),
        rate: options.rate,
        // Always the voice's own pitch: we never fake a voice by bending it.
        pitch: 1,
        onDone: () => end(true),
        onStopped: () => end(false),
        onError: () => end(false),
      });
    } catch {
      end(false);
    }
  }

  stop(): void {
    this.endCurrent(false);
    void Speech.stop().catch(() => undefined);
  }

  private endCurrent(finished: boolean) {
    const c = this.current;
    this.current = null;
    c?.(finished);
  }
}
