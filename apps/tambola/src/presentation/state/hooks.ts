import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  dabberById,
  FUN_VOICE,
  themeById,
  DABBERS,
  TICKET_THEMES,
  type Dabber,
  type TicketTheme,
} from '@/domain/entities/Look';
import { announcement } from '@/application/voice';
import { speaker } from '@/config/container';
import { funKey } from '../i18n/en';
import { useEntitlements } from './EntitlementsProvider';
import { useSettings } from './SettingsProvider';

/** The ticket theme and dabber in use: the player's choice while it is open, else the free default. */
export function useLooks(): { look: TicketTheme; dabber: Dabber } {
  const { settings } = useSettings();
  const { isOpen } = useEntitlements();
  return useMemo(() => {
    const chosenLook = themeById(settings.ticketTheme);
    const chosenDabber = dabberById(settings.dabber);
    return {
      look: isOpen(chosenLook) ? chosenLook : TICKET_THEMES[0]!,
      dabber: isOpen(chosenDabber) ? chosenDabber : DABBERS[0]!,
    };
  }, [settings.ticketTheme, settings.dabber, isOpen]);
}

/** How long the ball takes to roll in before the chime and the voice. */
export const ROLL_MS = 620;

/**
 * The caller's voice and the reveal's sounds. `call(n)` rolls the ball,
 * chimes as it lands, then speaks the number (and its rhyme with the
 * fun-call voice). `say(text)` speaks anything else, such as a winner.
 */
export function useAnnouncer() {
  const { settings, sounds, haptics } = useSettings();
  const { isOpen } = useEntitlements();
  const { t } = useTranslation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const funVoice = settings.funVoice && isOpen(FUN_VOICE);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      speaker.stop();
    },
    [],
  );

  const call = useCallback(
    (n: number) => {
      if (timer.current) clearTimeout(timer.current);
      sounds.play('roll');
      timer.current = setTimeout(() => {
        sounds.play('chime');
        haptics.pop();
        if (settings.voice) {
          speaker.speak(
            announcement(n, settings.voiceLanguage, funVoice ? t(funKey(n)) : undefined),
            settings.voiceLanguage,
          );
        }
      }, ROLL_MS);
    },
    [sounds, haptics, settings.voice, settings.voiceLanguage, funVoice, t],
  );

  const say = useCallback(
    (text: string) => {
      if (settings.voice) speaker.speak(text, 'en');
    },
    [settings.voice],
  );

  const hush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    speaker.stop();
  }, []);

  return useMemo(() => ({ call, say, hush }), [call, say, hush]);
}
