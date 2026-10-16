/**
 * The store's own in-app review card. The platform decides whether it
 * actually appears and rations it; asking never blocks anything.
 */
export interface IReviewPrompt {
  request(): Promise<void>;
}
