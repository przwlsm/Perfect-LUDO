import * as Speech from 'expo-speech';
import type { VoiceLanguage } from '@/domain/entities/Settings';
import type { ISpeaker } from '@/domain/ports/ISpeaker';

const LOCALES: Record<VoiceLanguage, readonly string[]> = {
  // Indian English first: it says the numbers the way a housie caller does.
  en: ['en-IN', 'en-GB', 'en-US', 'en'],
  hi: ['hi-IN', 'hi'],
};

/**
 * The device's own text-to-speech (offline, no network). Each call cuts off
 * the previous one, so a fast caller never queues up a backlog of numbers.
 */
export class ExpoSpeaker implements ISpeaker {
  private voices: Promise<Speech.Voice[]> | null = null;

  speak(text: string, language: VoiceLanguage): void {
    void this.pick(language)
      .then(async (voice) => {
        await Speech.stop().catch(() => undefined);
        Speech.speak(text, {
          language: voice?.language ?? LOCALES[language][0],
          voice: voice?.identifier,
          rate: 0.92,
          pitch: 1.02,
        });
      })
      .catch(() => undefined);
  }

  stop(): void {
    void Speech.stop().catch(() => undefined);
  }

  private async pick(language: VoiceLanguage): Promise<Speech.Voice | undefined> {
    this.voices ??= Speech.getAvailableVoicesAsync().catch(() => []);
    const voices = await this.voices;
    for (const locale of LOCALES[language]) {
      const prefix = locale.toLowerCase();
      const match = voices.find((v) =>
        v.language.toLowerCase().replace('_', '-').startsWith(prefix),
      );
      if (match) return match;
    }
    return undefined;
  }
}
