import { AppState, Platform } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import type { ISoundPlayer } from '../ports/ISoundPlayer';

export interface AudioCueOptions<Cue extends string> {
  /** One source per cue, typically `require('…/pop.wav')`. */
  readonly sources: Readonly<Record<Cue, AudioSource>>;
  /** Per-cue volume, 0–1 (default 0.6). */
  readonly volumes?: Partial<Record<Cue, number>>;
  /** Cues that fire in quick runs get several voices so one never cuts off the last. */
  readonly voices?: Partial<Record<Cue, number>>;
  /** An optional seamless loop steered by `loop(volume)`. */
  readonly loop?: AudioSource;
}

/**
 * Plays each cue from players created on first use, so launching an app
 * loads no audio. Silent while the app is in the background and, on the
 * web, until the player has touched the page (browsers block sound before
 * that). Mixes with the player's own music rather than stopping it, and
 * respects the ring/silent switch.
 */
export class AudioCuePlayer<Cue extends string> implements ISoundPlayer<Cue> {
  private readonly players = new Map<Cue, AudioPlayer[]>();
  private readonly next = new Map<Cue, number>();
  private loopPlayer: AudioPlayer | null = null;
  private configured = false;
  private interacted = false;

  constructor(private readonly options: AudioCueOptions<Cue>) {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const unlock = (event: Event) => {
        if (event.isTrusted) this.interacted = true;
      };
      document.addEventListener('pointerdown', unlock, true);
      document.addEventListener('keydown', unlock, true);
    }
    AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      for (const voices of this.players.values()) for (const p of voices) p.pause();
      this.loopPlayer?.pause();
    });
  }

  play(cue: Cue): void {
    if (!this.audible()) return;
    this.configure();
    const player = this.voiceFor(cue);
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  }

  loop(volume: number): void {
    const source = this.options.loop;
    if (!source) return;
    const v = Math.max(0, Math.min(1, volume));
    if (v < 0.01 || !this.audible()) {
      if (this.loopPlayer?.playing) this.loopPlayer.pause();
      return;
    }
    this.configure();
    if (!this.loopPlayer) {
      this.loopPlayer = createAudioPlayer(source);
      this.loopPlayer.loop = true;
    }
    this.loopPlayer.volume = v * 0.8;
    if (!this.loopPlayer.playing) this.loopPlayer.play();
  }

  private audible(): boolean {
    if (AppState.currentState === 'background') return false;
    return Platform.OS !== 'web' || this.interacted || hasUserActivation();
  }

  private voiceFor(cue: Cue): AudioPlayer {
    let voices = this.players.get(cue);
    if (!voices) {
      const count = this.options.voices?.[cue] ?? 1;
      voices = Array.from({ length: count }, () => {
        const p = createAudioPlayer(this.options.sources[cue]);
        p.volume = this.options.volumes?.[cue] ?? 0.6;
        return p;
      });
      this.players.set(cue, voices);
    }
    const k = this.next.get(cue) ?? 0;
    this.next.set(cue, (k + 1) % voices.length);
    return voices[k]!;
  }

  private configure(): void {
    if (this.configured) return;
    this.configured = true;
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
  }
}

function hasUserActivation(): boolean {
  return typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === true;
}
