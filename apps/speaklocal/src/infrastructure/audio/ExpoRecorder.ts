import { Platform } from 'react-native';
import {
  AudioModule,
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import type { IRecorder, MicPermission } from '@/domain/ports';

/** Voice in mono AAC: small files, clear enough to compare with the native line. */
const OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 96000,
};

/** What the native recorder takes on this platform (the shared options plus its own). */
function platformOptions(o: RecordingOptions) {
  const common = {
    extension: o.extension,
    sampleRate: o.sampleRate,
    numberOfChannels: o.numberOfChannels,
    bitRate: o.bitRate,
    isMeteringEnabled: false,
  };
  if (Platform.OS === 'ios') return { ...common, ...o.ios };
  if (Platform.OS === 'android') return { ...common, ...o.android };
  return { ...common, ...o.web };
}

/** expo-audio's recorder, made only when the learner taps Record. */
export class ExpoRecorder implements IRecorder {
  private recorder: AudioRecorder | null = null;
  private startedAt = 0;

  supported(): boolean {
    if (Platform.OS !== 'web') return true;
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  async permission(): Promise<MicPermission> {
    try {
      const p = await getRecordingPermissionsAsync();
      return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
    } catch {
      return 'denied';
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      return (await requestRecordingPermissionsAsync()).granted;
    } catch {
      return false;
    }
  }

  async start(): Promise<boolean> {
    try {
      await this.release();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      // The class the useAudioRecorder hook wraps; used directly so it is made only on demand.
      const Recorder = (
        AudioModule as unknown as { AudioRecorder: new (o: object) => AudioRecorder }
      ).AudioRecorder;
      const recorder = new Recorder(platformOptions(OPTIONS));
      await recorder.prepareToRecordAsync();
      recorder.record();
      this.recorder = recorder;
      this.startedAt = Date.now();
      return true;
    } catch {
      await this.release();
      return false;
    }
  }

  async stop(): Promise<{ uri: string; durationMs: number } | null> {
    const recorder = this.recorder;
    if (!recorder) return null;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const durationMs = Date.now() - this.startedAt;
      return uri && durationMs > 300 ? { uri, durationMs } : null;
    } catch {
      return null;
    } finally {
      // The file stays; only the native recorder object is let go.
      this.recorder = null;
      try {
        recorder.release();
      } catch {
        // Already released.
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
    }
  }

  private async release() {
    const r = this.recorder;
    this.recorder = null;
    if (r) {
      try {
        r.release();
      } catch {
        // Already released.
      }
    }
    // Back to playback through the speaker (iOS routes to the earpiece while recording).
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
      () => undefined,
    );
  }
}
