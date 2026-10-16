import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const RPC_TIMEOUT_MS = 15000;

/** A server function call that always resolves to a thrown, readable error or a value. */
export async function rpc<T>(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const { data, error } = await client.rpc(fn, args).abortSignal(controller.signal);
    if (error) throw toFriendlyError(error);
    return data as T;
  } catch (error) {
    throw error instanceof Error ? error : toFriendlyError(error);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Messages raised by our own server functions are written for players and
 * pass through; anything else (network, timeouts, internals) becomes one
 * plain sentence.
 */
export function toFriendlyError(error: unknown): Error {
  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (/aborted|network|fetch|timed? ?out/i.test(message) || !message) {
    return new Error('Could not reach the game server. Check your connection and try again.');
  }
  if (/^(permission denied|function .* does not exist|relation|syntax)/i.test(message)) {
    return new Error('The game server refused that. Please update the app.');
  }
  return new Error(message);
}

let channelSequence = 0;

/**
 * Two hooks watching the same rows must not share a channel topic, or
 * unmounting one would silently tear down the other's subscription.
 */
export function uniqueTopic(prefix: string): string {
  channelSequence += 1;
  return `${prefix}:${channelSequence}`;
}

export function removeChannel(client: SupabaseClient, channel: RealtimeChannel): void {
  void client.removeChannel(channel).catch(() => undefined);
}
