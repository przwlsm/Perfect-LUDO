import { router } from 'expo-router';

/**
 * Back to where the player came from, or home when there is nowhere to go
 * back to: a refreshed or deep-linked page has no history, and a back button
 * that does nothing strands them.
 */
export function goBackOrHome(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
