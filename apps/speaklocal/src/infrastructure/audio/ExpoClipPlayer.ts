import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { IClipPlayer } from '@/domain/ports';

/** Plays one clip at a time: a learner's take or a recorded native line. */
export class ExpoClipPlayer implements IClipPlayer {
  private player: AudioPlayer | null = null;
  private onEnd: (() => void) | null = null;

  play(source: string | number, onEnd?: () => void): void {
    this.stop();
    try {
      const player = createAudioPlayer(typeof source === 'string' ? { uri: source } : source);
      this.player = player;
      this.onEnd = onEnd ?? null;
      player.addListener('playbackStatusUpdate', (s) => {
        if (s.didJustFinish && this.player === player) this.finish();
      });
      player.play();
    } catch {
      onEnd?.();
    }
  }

  stop(): void {
    this.finish();
  }

  private finish() {
    const p = this.player;
    const cb = this.onEnd;
    this.player = null;
    this.onEnd = null;
    if (p) {
      try {
        p.pause();
        p.release();
      } catch {
        // Already gone.
      }
    }
    cb?.();
  }
}
