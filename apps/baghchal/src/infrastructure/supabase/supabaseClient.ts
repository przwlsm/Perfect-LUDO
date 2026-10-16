import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '@/domain/entities/OnlineMatch';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Online play is optional: with no Supabase credentials configured the app
 * stays fully playable offline, so a missing .env is a supported state
 * rather than a startup crash.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_* in .env');
  }
  if (client) return client;
  client = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Refreshing tokens on a timer while backgrounded wastes battery and can
  // fail on a sleeping radio; Supabase asks callers to gate it on AppState.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void client?.auth.startAutoRefresh();
      else void client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

/**
 * The login saved on this device, read straight from storage without the
 * network. Used when the server is slow to answer at start-up, so a guest
 * is never created twice for the same device.
 */
export async function readStoredSessionUser(): Promise<AuthUser | null> {
  if (!url) return null;
  try {
    const ref = new URL(url).hostname.split('.')[0];
    const raw = await AsyncStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: unknown; is_anonymous?: unknown } };
    const user = parsed.user;
    if (!user || typeof user.id !== 'string') return null;
    return { uid: user.id, isGuest: user.is_anonymous === true };
  } catch {
    return null;
  }
}
