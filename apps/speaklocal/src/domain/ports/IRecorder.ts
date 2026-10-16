import type { Recording } from '../entities/Recording';

export type MicPermission = 'granted' | 'denied' | 'undetermined';

/**
 * The microphone, used only after the learner taps Record. Permission is
 * asked on that first tap, never at launch.
 */
export interface IRecorder {
  /** False where recording cannot work (e.g. no microphone API). */
  supported(): boolean;
  permission(): Promise<MicPermission>;
  /** Shows the system prompt; true when granted. */
  requestPermission(): Promise<boolean>;
  /** Starts a take; false when it could not start. */
  start(): Promise<boolean>;
  /** Ends the take: its temporary file and length, or null when nothing was captured. */
  stop(): Promise<{ readonly uri: string; readonly durationMs: number } | null>;
}

/** Plays one audio file (a recording, or a recorded native line). */
export interface IClipPlayer {
  play(source: string | number, onEnd?: () => void): void;
  stop(): void;
}

/** Recordings kept on the device only, in the app's own folder. Never uploaded. */
export interface IRecordingStore {
  list(): Promise<readonly Recording[]>;
  /** Moves a finished take into the store. */
  save(
    tempUri: string,
    phraseKey: string,
    durationMs: number,
    at: number,
  ): Promise<Recording | null>;
  remove(recording: Recording): Promise<void>;
  removeAll(): Promise<void>;
}
