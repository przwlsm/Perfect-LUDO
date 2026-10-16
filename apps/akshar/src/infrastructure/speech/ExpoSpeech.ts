import * as Speech from 'expo-speech';
import type { ISpeech } from '@/domain/ports/ISpeech';

const norm = (tag: string) => tag.replace(/_/g, '-').toLowerCase();

/**
 * The device's own text-to-speech (no network, no recordings). Voices for
 * Indian languages vary a lot between phones, so the list is read once and
 * matched by language: an exact match first ("ta-IN"), then any voice for
 * the language ("ta-…").
 */
export class ExpoSpeech implements ISpeech {
  private voices: Promise<readonly Speech.Voice[]> | null = null;

  private list(): Promise<readonly Speech.Voice[]> {
    this.voices ??= (async () => {
      try {
        let v = await Speech.getAvailableVoicesAsync();
        // Browsers fill the list a moment after load.
        if (v.length === 0) {
          await new Promise((r) => setTimeout(r, 600));
          v = await Speech.getAvailableVoicesAsync();
        }
        if (v.length === 0) this.voices = null;
        return v;
      } catch {
        this.voices = null;
        return [];
      }
    })();
    return this.voices;
  }

  async voiceFor(languages: readonly string[]): Promise<string | null> {
    const voices = await this.list();
    const tags = voices.map((v) => norm(v.language));
    for (const lang of languages) {
      if (tags.includes(norm(lang))) return lang;
    }
    for (const lang of languages) {
      const base = norm(lang).split('-')[0]!;
      if (tags.some((t) => t === base || t.startsWith(`${base}-`))) return lang;
    }
    return null;
  }

  speak(text: string, language: string, slow = false): void {
    try {
      void Speech.stop();
      Speech.speak(text, { language, rate: slow ? 0.7 : 0.85, pitch: 1 });
    } catch {
      // Speech is a nicety; the romanisation is always on screen.
    }
  }

  stop(): void {
    void Speech.stop().catch(() => undefined);
  }
}
