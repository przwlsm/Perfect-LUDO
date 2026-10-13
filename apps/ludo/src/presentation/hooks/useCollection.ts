import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { collectionRepository } from '@/config/container';
import type { CollectionView } from '@/domain';
import { i18n } from '../i18n';
import { useProfile } from '../state/ProfileProvider';

const message = (e: unknown) => (e instanceof Error ? e.message : i18n.t('common:errors.generic'));

/**
 * One Collection Room: the signed-in member's own (no id) or another
 * player's. Loads whenever the screen comes into focus. The owner's
 * actions (showcase, privacy, marking new trophies seen) replace the room
 * with the server's answer.
 */
export function useCollection(userId?: string) {
  const { member } = useProfile();
  const [data, setData] = useState<CollectionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const load = useCallback(async () => {
    if (!member || !collectionRepository) return;
    try {
      const next = await collectionRepository.getCollection(userId);
      if (!alive.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (alive.current) setError(message(e));
    }
  }, [member, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(action: () => Promise<CollectionView>) {
    if (busy || !collectionRepository) return;
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      if (alive.current) setData(next);
    } catch (e) {
      if (alive.current) setError(message(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return {
    available: member && collectionRepository !== null,
    data,
    busy,
    error,
    reload: load,
    setShowcase: (items: readonly string[]) => run(() => collectionRepository!.setShowcase(items)),
    setPublic: (isPublic: boolean) => run(() => collectionRepository!.setPublic(isPublic)),
    markSeen: () => run(() => collectionRepository!.markUnlocksSeen()),
  };
}
