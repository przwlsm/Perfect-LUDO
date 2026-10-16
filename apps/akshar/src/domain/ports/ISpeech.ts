/**
 * Reads a letter or word aloud with the device's own text-to-speech. Not
 * every phone has a voice for every Indian language; callers ask first and
 * show the romanisation prominently when there is none.
 */
export interface ISpeech {
  /** The first of `languages` (BCP 47) this device can speak, or null. */
  voiceFor(languages: readonly string[]): Promise<string | null>;
  /** Speaks `text`; never throws. */
  speak(text: string, language: string, slow?: boolean): void;
  stop(): void;
}

export const SILENT_SPEECH: ISpeech = {
  voiceFor: () => Promise.resolve(null),
  speak() {},
  stop() {},
};
