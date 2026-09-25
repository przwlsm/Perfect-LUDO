import type { Friend, FriendRequest, Unsubscribe, UserSearchResult } from '../entities/Social';

/**
 * Discovery and the friendship lifecycle.
 *
 * Every method here is a request the server is free to refuse — the client
 * mirrors some of these rules for instant feedback, but the backend re-checks
 * all of them. Rejections surface as thrown errors carrying a message meant
 * for the player.
 */
export interface IFriendsRepository {
  /** Prefix match on username, or an exact user id. */
  searchUsers(query: string): Promise<readonly UserSearchResult[]>;
  listFriends(): Promise<readonly Friend[]>;
  listIncomingRequests(): Promise<readonly FriendRequest[]>;
  listSentRequests(): Promise<readonly FriendRequest[]>;
  sendRequest(targetUserId: string): Promise<void>;
  respondToRequest(requestId: string, accept: boolean): Promise<void>;
  cancelRequest(requestId: string): Promise<void>;
  removeFriend(friendId: string): Promise<void>;
  /** Fires when any friendship, request or friend's presence changes. */
  subscribe(onChange: () => void): Unsubscribe;
}
