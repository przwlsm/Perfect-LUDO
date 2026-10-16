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
  select: require('../../../assets/audio/select.wav'),
  place: require('../../../assets/audio/place.wav'),
  move: require('../../../assets/audio/move.wav'),
  capture: require('../../../assets/audio/capture.wav'),
  win: require('../../../assets/audio/win.wav'),
  lose: require('../../../assets/audio/lose.wav'),
};

const VOLUME = 0.55;

/**
 * Plays each cue from a player created on its first use, so launching the
 * app loads no audio at all. Silent while the app is in the background and,
 * on the web, until the player has touched the page (browsers block sound
 * before that).
 */
export class ExpoAudioSoundPlayer implements ISoundPlayer {
  private readonly players = new Map<SoundCue, AudioPlayer>();
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
      if (state !== 'active') for (const player of this.players.values()) player.pause();
    });
  }

  play(cue: SoundCue): void {
    if (AppState.currentState === 'background') return;
    if (Platform.OS === 'web' && !this.interacted && !hasUserActivation()) return;
    this.configure();
    const player = this.playerFor(cue);
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  }

  private playerFor(cue: SoundCue): AudioPlayer {
    const existing = this.players.get(cue);
    if (existing) return existing;
    const player = createAudioPlayer(SOURCES[cue]);
    player.volume = VOLUME;
    this.players.set(cue, player);
    return player;
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
