import type { VoiceLanguage } from '../entities/Settings';

/**
 * The caller's voice: the device's own text-to-speech, offline. Fire and
 * forget; a device without a voice for the language simply stays quiet.
 */
export interface ISpeaker {
  speak(text: string, language: VoiceLanguage): void;
  stop(): void;
}

export const SILENT_SPEAKER: ISpeaker = {
  speak() {},
  stop() {},
};
