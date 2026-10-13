import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { cupsRepository } from '@/config/container';
import type { CupBracket, CupsView } from '@/domain';
import { i18n } from '../i18n';
import { useProfile } from '../state/ProfileProvider';

const message = (e: unknown) => (e instanceof Error ? e.message : i18n.t('common:errors.generic'));

/** How often an open bracket is re-read; reading is what moves it on the server. */
export const BRACKET_POLL_MS = 3000;

/** The halls, and entering one. */
export function useCups() {
  const { member, refreshWallet } = useProfile();
  const [data, setData] = useState<CupsView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const load = useCallback(async () => {
    if (!member || !cupsRepository) return;
    try {
      const next = await cupsRepository.list();
      if (!alive.current) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (alive.current) setError(message(e));
    }
  }, [member]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  /** Pays the entry and returns the bracket to open, or null on failure. */
  async function join(cupId: string): Promise<CupBracket | null> {
    if (busy || !cupsRepository) return null;
    setBusy(cupId);
    setError(null);
    try {
      const bracket = await cupsRepository.join(cupId);
      await refreshWallet();
      return bracket;
    } catch (e) {
      if (alive.current) setError(message(e));
      return null;
    } finally {
      if (alive.current) setBusy(null);
    }
  }

  /** Runs one of the entering actions, returning the bracket to open. */
  async function enter(key: string, action: () => Promise<CupBracket>): Promise<CupBracket | null> {
    if (busy || !cupsRepository) return null;
    setBusy(key);
    setError(null);
    try {
      const bracket = await action();
      await refreshWallet();
      return bracket;
    } catch (e) {
      if (alive.current) setError(message(e));
      return null;
    } finally {
      if (alive.current) setBusy(null);
    }
  }

  return {
    available: member && cupsRepository !== null,
    data,
    busy,
    error,
    reload: load,
    join,
    createPrivate: (cupId: string) =>
      enter(`private:${cupId}`, () => cupsRepository!.createPrivate(cupId)),
    joinByCode: (code: string) => enter('code', () => cupsRepository!.joinByCode(code)),
  };
}

/** One bracket, re-read every few seconds while it is open and the screen is in view. */
export function useCupBracket(bracketId: string | null) {
  const { member, refreshWallet } = useProfile();
  const [data, setData] = useState<CupBracket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => () => void (alive.current = false), []);

  const load = useCallback(async () => {
    if (!member || !cupsRepository || !bracketId || inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await cupsRepository.get(bracketId);
      if (!alive.current) return;
      setData((prev) => {
        // The prizes land on the wallet the moment the bracket closes.
        if (prev && prev.status !== 'FINISHED' && next.status === 'FINISHED') void refreshWallet();
        return next;
      });
      setError(null);
    } catch (e) {
      if (alive.current) setError(message(e));
    } finally {
      inFlight.current = false;
    }
  }, [member, bracketId, refreshWallet]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), BRACKET_POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function leave() {
    if (busy || !cupsRepository || !bracketId) return false;
    setBusy(true);
    try {
      await cupsRepository.leave(bracketId);
      await refreshWallet();
      return true;
    } catch (e) {
      if (alive.current) setError(message(e));
      return false;
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function startPrivate() {
    if (busy || !cupsRepository || !bracketId) return;
    setBusy(true);
    setError(null);
    try {
      const next = await cupsRepository.startPrivate(bracketId);
      if (alive.current) setData(next);
    } catch (e) {
      if (alive.current) setError(message(e));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return { data, error, busy, reload: load, leave, startPrivate };
}
