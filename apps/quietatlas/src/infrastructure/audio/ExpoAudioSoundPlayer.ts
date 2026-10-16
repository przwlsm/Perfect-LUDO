import { AppState, Platform } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from 'expo-audio';
import type { ISoundPlayer, SoundCue } from '@/domain/ports/ISoundPlayer';

// Original synthesized effects; regenerate with `npm run sounds`.
const SOURCES: Readonly<Record<SoundCue, AudioSource>> = {
  pop: require('../../../assets/audio/pop.wav'),
  popHigh: require('../../../assets/audio/popHigh.wav'),
  popLow: require('../../../assets/audio/popLow.wav'),
  golden: require('../../../assets/audio/golden.wav'),
  sprinkle: require('../../../assets/audio/sprinkle.wav'),
  ink: require('../../../assets/audio/ink.wav'),
  swish: require('../../../assets/audio/swish.wav'),
  paper: require('../../../assets/audio/paper.wav'),
  strike: require('../../../assets/audio/strike.wav'),
  chime: require('../../../assets/audio/chime.wav'),
  chimeLow: require('../../../assets/audio/chimeLow.wav'),
  tap: require('../../../assets/audio/tap.wav'),
};
const HUM: AudioSource = require('../../../assets/audio/hum.wav');

const VOLUME: Partial<Record<SoundCue, number>> = { sprinkle: 0.25, swish: 0.35, tap: 0.3 };
/** Cues that fire in quick runs get several voices, so one never cuts off the last. */
const VOICES: Partial<Record<SoundCue, number>> = { pop: 3, popHigh: 3, popLow: 3, ink: 2 };

/**
 * Plays each cue from players created on first use, so launching the app
 * loads no audio. Silent while the app is in the background and, on the
 * web, until the player has touched the page (browsers block sound before
 * that). Mixes with the player's own music rather than stopping it.
 */
export class ExpoAudioSoundPlayer implements ISoundPlayer {
  private readonly players = new Map<SoundCue, AudioPlayer[]>();
  private readonly next = new Map<SoundCue, number>();
  private humPlayer: AudioPlayer | null = null;
  private configured = false;
  private interacted = false;

  constructor() {
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
      this.humPlayer?.pause();
    });
  }

  play(cue: SoundCue): void {
    if (!this.audible()) return;
    this.configure();
    const player = this.voiceFor(cue);
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  }

  hum(volume: number): void {
    const v = Math.max(0, Math.min(1, volume));
    if (v < 0.01 || !this.audible()) {
      if (this.humPlayer?.playing) this.humPlayer.pause();
      return;
    }
    this.configure();
    if (!this.humPlayer) {
      this.humPlayer = createAudioPlayer(HUM);
      this.humPlayer.loop = true;
    }
    this.humPlayer.volume = v * 0.8;
    if (!this.humPlayer.playing) this.humPlayer.play();
  }

  private audible(): boolean {
    if (AppState.currentState === 'background') return false;
    return Platform.OS !== 'web' || this.interacted || hasUserActivation();
  }

  private voiceFor(cue: SoundCue): AudioPlayer {
    let voices = this.players.get(cue);
    if (!voices) {
      voices = Array.from({ length: VOICES[cue] ?? 1 }, () => {
        const p = createAudioPlayer(SOURCES[cue]);
        p.volume = VOLUME[cue] ?? 0.6;
        return p;
      });
      this.players.set(cue, voices);
    }
    const k = this.next.get(cue) ?? 0;
    this.next.set(cue, (k + 1) % voices.length);
    return voices[k]!;
  }

  /** Respect the ring/silent switch and never interrupt the player's own music. */
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
