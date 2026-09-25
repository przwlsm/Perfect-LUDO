import { useEffect, useState } from 'react';
import { socialIdentityRepository } from '@/config/container';

export type UsernameCheck =
  | { readonly status: 'idle' }
  | { readonly status: 'checking' }
  | { readonly status: 'available' }
  | { readonly status: 'unavailable'; readonly reason: string };

const DEBOUNCE_MS = 400;

/**
 * Live "✓ available / ✕ taken" while typing. The verdict is the server's;
 * this only decides when to ask, and ignores answers to names the player
 * has since typed over.
 */
export function useUsernameAvailability(username: string): UsernameCheck {
  const candidate = username.trim().toLowerCase();
  const [result, setResult] = useState<{ for: string; check: UsernameCheck } | null>(null);

  useEffect(() => {
    if (candidate.length < 3 || !socialIdentityRepository) return;
    const repository = socialIdentityRepository;
    let active = true;
    const timer = setTimeout(() => {
      void repository
        .checkUsername(candidate)
        .then((verdict) => {
          if (!active) return;
          setResult({
            for: candidate,
            check: verdict.available
              ? { status: 'available' }
              : {
                  status: 'unavailable',
                  reason: verdict.reason ?? 'That username cannot be used.',
                },
          });
        })
        .catch(() => {
          // Unknown rather than a verdict either way; the server re-checks on save.
          if (active) setResult({ for: candidate, check: { status: 'idle' } });
        });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [candidate]);

  if (candidate.length < 3 || !socialIdentityRepository) return { status: 'idle' };
  if (result?.for === candidate) return result.check;
  return { status: 'checking' };
}
