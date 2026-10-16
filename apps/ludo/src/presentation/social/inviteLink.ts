import { Share } from 'react-native';
import * as Linking from 'expo-linking';
import { i18n } from '../i18n';

/** Opens this app straight at the join screen for `code` (perfectludo://join/CODE). */
export function inviteLink(code: string): string {
  return Linking.createURL(`join/${code}`);
}

/**
 * The message a host sends. The code is spelled out as well as linked, so
 * it still works for someone whose chat app will not open app links.
 */
export function inviteMessage(code: string): string {
  return i18n.t('social:invite.share', { link: inviteLink(code), code });
}

/** The system share sheet; resolves quietly if the player dismisses it. */
export async function shareInvite(code: string): Promise<void> {
  try {
    await Share.share({ message: inviteMessage(code) });
  } catch {
    // Dismissed or no share target: nothing to report.
  }
}
