import { useEffect, useRef, useState } from 'react';
import { friendsRepository } from '@/config/container';
import type { UserSearchResult } from '@/domain';
import { i18n } from '../i18n';

const DEBOUNCE_MS = 300;
/** The server refuses anything shorter, so don't spend a round trip on it. */
const MIN_QUERY = 2;
const NONE: readonly UserSearchResult[] = [];

export interface UserSearch {
  readonly query: string;
  setQuery(query: string): void;
  readonly results: readonly UserSearchResult[];
  readonly searching: boolean;
  /** True once the query is long enough to be worth showing results for. */
  readonly active: boolean;
  readonly error: string | null;
}

/**
 * Owns one thing: turning what the player types into a list of players.
 *
 * Results are stored together with the query they answer, so a slow response
 * for an earlier query is simply never shown rather than having to be cleared.
 */
export function useUserSearch(enabled: boolean): UserSearch {
  const [query, setQuery] = useState('');
  const [hit, setHit] = useState<{ query: string; rows: readonly UserSearchResult[] }>({
    query: '',
    rows: NONE,
  });
  const [pending, setPending] = useState<string | null>(null);
  // The server's message, or {} when the fallback applies (translated at render).
  const [error, setError] = useState<{ message?: string } | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const trimmed = query.trim();
  const active = enabled && trimmed.length >= MIN_QUERY;

  useEffect(() => {
    const repository = friendsRepository;
    if (!repository || !active) return;
    let activeRequest = true;
    const timer = setTimeout(() => {
      setPending(trimmed);
      setError(null);
      void repository
        .searchUsers(trimmed)
        .then((rows) => {
          if (mounted.current && activeRequest) {
            setHit({ query: trimmed, rows });
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (mounted.current && activeRequest) {
            setHit({ query: trimmed, rows: NONE });
            setError(e instanceof Error ? { message: e.message } : {});
          }
        })
        .finally(() => {
          if (mounted.current && activeRequest) setPending(null);
        });
    }, DEBOUNCE_MS);
    return () => {
      activeRequest = false;
      clearTimeout(timer);
    };
  }, [trimmed, active]);

  return {
    query,
    setQuery,
    results: active && hit.query === trimmed ? hit.rows : NONE,
    searching: active && (pending === trimmed || hit.query !== trimmed),
    active,
    error: error ? (error.message ?? i18n.t('social:search.unavailable')) : null,
  };
}
