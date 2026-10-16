import { useEffect, useRef, useState } from 'react';
import { socialIdentityRepository } from '@/config/container';
import type { SocialIdentity } from '@/domain';

export interface SocialIdentityState {
  readonly identity: SocialIdentity | null;
  setIdentity(identity: SocialIdentity): void;
}

/**
 * Owns one thing: the handle other players find this account by.
 *
 * Claimed as soon as an account exists rather than when the friends screen is
 * first opened, so a brand-new player is discoverable immediately.
 */
export function useSocialIdentity(userId: string | null, displayName: string): SocialIdentityState {
  const [identity, setIdentity] = useState<SocialIdentity | null>(null);

  // Read through a ref so renaming does not re-run the claim below.
  const name = useRef(displayName);
  useEffect(() => {
    name.current = displayName;
  }, [displayName]);

  useEffect(() => {
    if (!userId || !socialIdentityRepository) return;
    let active = true;
    void socialIdentityRepository
      .ensure(name.current)
      .then((next) => {
        if (active) setIdentity(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId]);

  // Derived rather than cleared in an effect, so signing out cannot briefly
  // leave the previous account's handle on screen.
  return { identity: userId ? identity : null, setIdentity };
}
