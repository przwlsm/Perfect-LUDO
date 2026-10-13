import { Share } from 'react-native';
import * as Linking from 'expo-linking';
import { i18n } from '../i18n';

/** Opens this app straight at the cup's join screen (perfectludo://cups/join/CODE). */
export function cupInviteLink(code: string): string {
  return Linking.createURL(`cups/join/${code}`);
}

/** The system share sheet with the code spelled out as well as linked. */
export async function shareCupInvite(code: string): Promise<void> {
  try {
    await Share.share({
      message: i18n.t('cups:private.shareMessage', { link: cupInviteLink(code), code }),
    });
  } catch {
    // Dismissed or no share target: nothing to report.
  }
}
