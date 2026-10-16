/** A text-to-speech voice the device offers. Platforms do not say which are female or male. */
export interface DeviceVoice {
  readonly id: string;
  readonly name: string;
  /** BCP 47-ish tag as the platform reports it ("kn-IN", "kn_IN"). */
  readonly language: string;
  /** The platform marks it as a higher-quality ("enhanced") voice. */
  readonly enhanced: boolean;
}

export interface SpeakOptions {
  readonly language: string;
  /** A DeviceVoice id; the language's default voice when absent. */
  readonly voice?: string;
  /** 1 is the voice's natural pace. */
  readonly rate: number;
  /** Called once when speaking ends; `finished` is false when stopped or failed. */
  readonly onEnd?: (finished: boolean) => void;
}

/**
 * The device's own text-to-speech: no network, nothing recorded. Not every
 * phone has a voice for every Indian language, so callers ask first and
 * show the romanisation big when there is none.
 */
export interface ISpeech {
  voices(): Promise<readonly DeviceVoice[]>;
  /** Speaks `text`, stopping anything already speaking. Never throws. */
  speak(text: string, options: SpeakOptions): void;
  stop(): void;
}

export const SILENT_SPEECH: ISpeech = {
  voices: () => Promise.resolve([]),
  speak(_text, options) {
    options.onEnd?.(false);
  },
  stop() {},
};
