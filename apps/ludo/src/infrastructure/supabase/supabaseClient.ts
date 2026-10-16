import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SocialProvider } from '@/domain';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Cloud sync is optional: with no Supabase credentials configured the app
 * stays fully playable on local storage alone, so a missing .env is a
 * supported state rather than a startup crash.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Avoid navigating users to a provider error page when a provider is disabled. */
export async function isSocialProviderEnabled(provider: SocialProvider): Promise<boolean> {
  if (!url || !anonKey) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Service unavailable');
    const settings = (await response.json()) as {
      external?: Partial<Record<SocialProvider, boolean>>;
    };
    return settings.external?.[provider] === true;
  } catch {
    throw new Error('Could not reach the sign-in service. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Cheap, unauthenticated, and answered by the same edge that serves the
 * game's API, so it is a fair test of "can this device talk to the server"
 * rather than merely "is Wi-Fi on".
 */
export async function probeSupabaseHealth(timeoutMs = 5000): Promise<boolean> {
  if (!url || !anonKey) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: controller.signal,
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_* in .env');
  }
  if (client) return client;

  client = createClient(url!, anonKey!, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // The callback route owns code exchange on every platform.
      flowType: 'pkce',
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
 * The account of the login saved on this device, read straight from storage
 * without contacting the server. Used only when the server cannot be reached
 * at start-up, so an offline player still opens the app as themselves.
 * Supabase stores the session under `sb-<project ref>-auth-token`.
 */
export async function readStoredSessionUser(): Promise<{
  uid: string;
  email: string | null;
  isGuest: boolean;
} | null> {
  if (!url) return null;
  try {
    const ref = new URL(url).hostname.split('.')[0];
    const raw = await AsyncStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      user?: { id?: unknown; email?: unknown; is_anonymous?: unknown };
      currentSession?: { user?: { id?: unknown; email?: unknown; is_anonymous?: unknown } };
    };
    const user = parsed.user ?? parsed.currentSession?.user;
    if (!user || typeof user.id !== 'string') return null;
    return {
      uid: user.id,
      email: typeof user.email === 'string' ? user.email : null,
      isGuest: user.is_anonymous === true,
    };
  } catch {
    return null;
  }
}
