import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { toFriendlyError } from './socialRows';

/** Resolves the signed-in user without an async round trip on every render. */
export type CurrentUserId = () => string | null;

export async function rpc<T>(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const { data, error } = await client.rpc(fn, args).abortSignal(controller.signal);
    if (error) throw toFriendlyError(error);
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
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
