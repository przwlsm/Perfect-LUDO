import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import type { GameFeedback } from './gameFeedback';

export function useGameSounds(
  feedback: GameFeedback | null,
  enabled: boolean,
  active: boolean,
  animate: boolean,
) {
  const consumed = useRef(0);
  const interacted = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const unlock = (event: Event) => {
      if (event.isTrusted) interacted.current = true;
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => {
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
  }, []);
  const roll = useAudioPlayer(require('../../../assets/audio/roll.wav'));
  const step = useAudioPlayer(require('../../../assets/audio/step.wav'));
  const enter = useAudioPlayer(require('../../../assets/audio/enter.wav'));
  const capture = useAudioPlayer(require('../../../assets/audio/capture.wav'));
  const home = useAudioPlayer(require('../../../assets/audio/home.wav'));
  const win = useAudioPlayer(require('../../../assets/audio/win.wav'));
  const players = useMemo(
    () => ({ roll, step, enter, capture, home, win }),
    [roll, step, enter, capture, home, win],
  );
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
    for (const player of Object.values(players)) player.volume = 0.55;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') for (const player of Object.values(players)) player.pause();
    });
    return () => subscription.remove();
  }, [players]);
  useEffect(() => {
    if (!enabled || !active) for (const player of Object.values(players)) player.pause();
  }, [enabled, active, players]);
  useEffect(() => {
    if (!feedback || feedback.id === consumed.current) return;
    consumed.current = feedback.id;
    if (!enabled || !active) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const play = (name: keyof typeof players) => {
      if (cancelled || AppState.currentState === 'background') return;
      // A resumed AI/online turn may arrive before the browser allows sound.
      // Skip it rather than asking Expo's web player to start blocked playback.
      if (
        Platform.OS === 'web' &&
        !interacted.current &&
        !(typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive)
      )
        return;
      const player = players[name];
      void player
        .seekTo(0)
        .then(() => {
          if (!cancelled) player.play();
        })
        .catch(() => undefined);
    };
    if (feedback.cue === 'roll' || !animate) play(feedback.cue);
    else {
      const stepMs = feedback.steps === 1 ? 240 : 100;
      for (let i = 0; i < feedback.steps; i++)
        timers.push(setTimeout(() => play('step'), i * stepMs));
      if (feedback.cue !== 'step')
        timers.push(setTimeout(() => play(feedback.cue), feedback.steps * stepMs));
    }
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [feedback, enabled, active, animate, players]);
}
