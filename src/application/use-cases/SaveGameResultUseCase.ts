import type { IUserProgressRepository, PlayerColor, UserProfile } from '@/domain';

/**
 * Records a finished game's outcome against the signed-in player's own
 * profile. Only the local human's result is ever recorded — an AI
 * opponent's color never has a uid, so there's nothing to save for it.
 */
export async function saveGameResult(
  progress: IUserProgressRepository,
  uid: string,
  humanColor: PlayerColor,
  winnerColor: PlayerColor,
): Promise<UserProfile> {
  return progress.recordGameResult(uid, { won: humanColor === winnerColor });
}
